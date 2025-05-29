/* eslint-disable @typescript-eslint/no-explicit-any */
import { BracketsManager } from 'brackets-manager';
import { LocalStorage } from './localStorage';

export interface TournamentPlayer {
  id: string;
  name: string;
}

export interface TournamentSettings {
  type: 'single_elimination' | 'double_elimination';
  gameType: 'singles' | 'doubles';
}

export class TournamentManager {
  private storage: LocalStorage;
  private manager: BracketsManager;
  private currentTournamentId: number | null = null;

  constructor() {
    this.storage = new LocalStorage();
    this.manager = new BracketsManager(this.storage as any);
  }

  async createTournament(
    players: TournamentPlayer[],
    settings: TournamentSettings
  ): Promise<string | number> {
    try {
      console.log('Creating tournament with players:', players);
      console.log('Tournament settings:', settings);
      
      // Clear any existing tournament data
      await this.storage.clear();

      // Prepare participants (teams for doubles, players for singles)
      const participantData = this.prepareParticipants(players, settings.gameType);
      console.log('Prepared participants:', participantData);

      // Create participants in the database first
      const participantIds: number[] = [];
      for (const participant of participantData) {
        const id = await this.storage.insert('participant', {
          tournament_id: 1,
          name: participant.name
        });
        participantIds.push(id);
        console.log('Created participant:', { id, name: participant.name });
      }

      console.log('All participant IDs:', participantIds);

      // Create the tournament stage with participant IDs
      const stage = await this.manager.create.stage({
        tournamentId: 1,
        name: `${settings.gameType === 'singles' ? 'Singles' : 'Doubles'} Tournament`,
        type: settings.type,
        seeding: participantIds,
        settings: {
          grandFinal: settings.type === 'double_elimination' ? 'double' : 'none',
        },
      });

      console.log('Created stage:', stage);
      
      // Debug: Check what matches were created
      const matches = await this.storage.select('match');
      console.log('Matches after creation:', matches);

      this.currentTournamentId = 1;
      return stage.id;
    } catch (error) {
      console.error('Error creating tournament:', error);
      throw error;
    }
  }

  private prepareParticipants(players: TournamentPlayer[], gameType: string): any[] {
    if (gameType === 'singles') {
      return players.map((player, index) => ({
        id: index + 1,
        name: player.name
      }));
    } else {
      // For doubles, pair players into teams
      const teams: any[] = [];
      let teamId = 1;
      for (let i = 0; i < players.length; i += 2) {
        if (i + 1 < players.length) {
          teams.push({
            id: teamId++,
            name: `${players[i].name} & ${players[i + 1].name}`
          });
        } else {
          // Odd number of players, add as single player team
          teams.push({
            id: teamId++,
            name: players[i].name
          });
        }
      }
      return teams;
    }
  }

  async getTournamentData() {
    if (!this.currentTournamentId) {
      return null;
    }

    try {
      const data = await this.manager.get.tournamentData(this.currentTournamentId);
      return data;
    } catch (error) {
      console.error('Error getting tournament data:', error);
      return null;
    }
  }

  async updateMatch(matchId: number, opponent1Score: number, opponent2Score: number) {
    try {
      console.log('Updating match:', { matchId, opponent1Score, opponent2Score });
      
      // Get current match data to understand its structure
      const currentMatch = await this.storage.select('match', matchId);
      console.log('Current match data:', currentMatch);
      
      if (!currentMatch || currentMatch.length === 0) {
        throw new Error(`Match with ID ${matchId} not found`);
      }
      
      const match = currentMatch[0];
      console.log('Match to update:', match);
      console.log('Match status:', match.status, '(0=waiting, 1=locked, 2=ready, 3=running, 4=completed)');
      
      // Check if match is in a valid state for updating
      if (match.status === 4) { // completed
        throw new Error('Cannot update a completed match');
      }
      
      // If match is not ready (status 2), we need to set it to ready first
      if (match.status !== 2) {
        console.log(`Match status is ${match.status}, setting to ready (2) first...`);
        await this.storage.update('match', matchId, { status: 2 });
        console.log('Match status updated to ready');
      }
      
      // Determine winner
      const opponent1Wins = opponent1Score > opponent2Score;
      
      // Use the format expected by brackets-manager with proper typing
      const updateData = {
        id: matchId,
        opponent1: { 
          score: opponent1Score,
          result: (opponent1Wins ? 'win' : 'loss') as 'win' | 'loss'
        },
        opponent2: { 
          score: opponent2Score,
          result: (opponent1Wins ? 'loss' : 'win') as 'win' | 'loss'
        }
      };
      
      console.log('Sending update data to brackets-manager:', updateData);
      
      try {
        await this.manager.update.match(updateData);
        console.log('Match updated successfully via brackets-manager');
      } catch (managerError) {
        console.warn('brackets-manager update failed, attempting manual fallback:', managerError);
        
        // Fallback: manually update the match in storage
        const winnerId = opponent1Wins ? match.opponent1?.id : match.opponent2?.id;
        
        await this.storage.update('match', matchId, {
          status: 4, // completed
          opponent1: {
            ...match.opponent1,
            score: opponent1Score,
            result: opponent1Wins ? 'win' : 'loss'
          },
          opponent2: {
            ...match.opponent2,
            score: opponent2Score,
            result: opponent1Wins ? 'loss' : 'win'
          }
        });
        
        console.log('Match updated via manual fallback');
        
        // Try to advance winner to next round manually
        try {
          await this.advanceWinnerToNextRound(matchId, winnerId);
        } catch (advanceError) {
          console.warn('Could not advance winner to next round:', advanceError);
        }
      }
      
      // Debug: Check matches after update
      const matches = await this.storage.select('match');
      console.log('All matches after update:', matches);
      
      // Debug: Check if new matches were created for next round
      const updatedMatch = matches.find((m: any) => m.id === matchId);
      console.log('Updated match details:', updatedMatch);

      return true;
    } catch (error) {
      console.error('Error updating match:', error);
      console.error('Error details:', (error as Error).message);
      throw error; // Re-throw to maintain error chain
    }
  }

  private async advanceWinnerToNextRound(completedMatchId: number, winnerId: number | null) {
    if (!winnerId) return;
    
    console.log('Attempting to advance winner to next round:', { completedMatchId, winnerId });
    
    // Get the completed match details
    const allMatches = await this.storage.select('match');
    const completedMatch = allMatches.find((m: any) => m.id === completedMatchId);
    if (!completedMatch) {
      console.log('Completed match not found');
      return;
    }
    
    console.log('Completed match details:', completedMatch);
    
    // Find the next round that should receive this winner
    // In a single elimination tournament, each match sends its winner to a specific next match
    const nextRoundId = completedMatch.round_id + 1;
    const nextRoundMatches = allMatches.filter((match: any) => 
      match.round_id === nextRoundId && match.status === 0 // waiting
    );
    
    console.log('Next round matches:', nextRoundMatches);
    
    if (nextRoundMatches.length === 0) {
      console.log('No next round matches found - tournament may be complete');
      return;
    }
    
    // For single elimination, determine which next match should receive this winner
    // This is based on the match number/position in the current round
    const nextMatchIndex = Math.floor((completedMatch.number - 1) / 2);
    const targetNextMatch = nextRoundMatches[nextMatchIndex];
    
    if (!targetNextMatch) {
      console.log('Target next match not found');
      return;
    }
    
    console.log('Target next match for winner:', targetNextMatch);
    
    // Determine which position in the next match this winner should take
    // Even numbered matches (0, 2, 4...) send winner to opponent1
    // Odd numbered matches (1, 3, 5...) send winner to opponent2
    const isEvenMatch = (completedMatch.number - 1) % 2 === 0;
    const targetPosition = isEvenMatch ? 'opponent1' : 'opponent2';
    
    console.log(`Advancing winner ${winnerId} to ${targetPosition} of match ${targetNextMatch.id}`);
    
    // Update the next match with the winner
    const updateData: any = {};
    updateData[targetPosition] = {
      ...targetNextMatch[targetPosition],
      id: winnerId
    };
    
    await this.storage.update('match', targetNextMatch.id, updateData);
    
    // Check if the next match now has both opponents and can be set to ready
    const updatedNextMatch = await this.storage.select('match', targetNextMatch.id);
    if (updatedNextMatch && updatedNextMatch[0]) {
      const match = updatedNextMatch[0];
      if (match.opponent1?.id && match.opponent2?.id && match.status === 0) {
        console.log(`Setting match ${match.id} to ready status`);
        await this.storage.update('match', match.id, { status: 2 }); // ready
      }
    }
    
    console.log('Winner advancement completed');
  }

  async getMatches() {
    try {
      const matches = await this.storage.select('match');
      return matches;
    } catch (error) {
      console.error('Error getting matches:', error);
      return [];
    }
  }

  async getParticipants() {
    try {
      const participants = await this.storage.select('participant');
      return participants;
    } catch (error) {
      console.error('Error getting participants:', error);
      return [];
    }
  }

  async resetTournament() {
    await this.storage.clear();
    this.currentTournamentId = null;
  }

  async getFinalStandings() {
    if (!this.currentTournamentId) {
      return [];
    }

    try {
      const standings = await this.manager.get.finalStandings(this.currentTournamentId);
      return standings;
    } catch (error) {
      console.error('Error getting final standings:', error);
      return [];
    }
  }

  // Get all tournament data for the viewer
  async getViewerData() {
    try {
      const data = await this.storage.getAllData();
      return {
        stages: data.stage || [],
        matches: data.match || [],
        matchGames: data.match_game || [],
        participants: data.participant || [],
        groups: data.group || [],
        rounds: data.round || [],
      };
    } catch (error) {
      console.error('Error getting viewer data:', error);
      return {
        stages: [],
        matches: [],
        matchGames: [],
        participants: [],
        groups: [],
        rounds: [],
      };
    }
  }
} 