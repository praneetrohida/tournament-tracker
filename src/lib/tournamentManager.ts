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
    
    console.log('=== ADVANCING WINNER TO NEXT ROUND ===');
    console.log('Completed match ID:', completedMatchId);
    console.log('Winner ID:', winnerId);
    
    // Get all matches
    const allMatches = await this.storage.select('match');
    const completedMatch = allMatches.find((m: any) => m.id === completedMatchId);
    if (!completedMatch) {
      console.log('❌ Completed match not found');
      return;
    }
    
    console.log('✅ Completed match details:', completedMatch);
    console.log('Match number:', completedMatch.number);
    console.log('Round ID:', completedMatch.round_id);
    
    // Find ALL matches in the next round (both waiting and ready)
    const nextRoundId = completedMatch.round_id + 1;
    console.log('Looking for next round ID:', nextRoundId);
    
    const allNextRoundMatches = allMatches.filter((match: any) => 
      match.round_id === nextRoundId
    );
    
    console.log('All next round matches found:', allNextRoundMatches.length);
    console.log('All next round matches:', allNextRoundMatches.map(m => ({ 
      id: m.id, 
      number: m.number, 
      status: m.status,
      opponent1: m.opponent1?.id || 'empty',
      opponent2: m.opponent2?.id || 'empty'
    })));
    
    if (allNextRoundMatches.length === 0) {
      console.log('⚠️ No next round matches found - tournament may be complete');
      return;
    }
    
    // Sort by match number to ensure consistent order
    const sortedNextRoundMatches = allNextRoundMatches.sort((a, b) => a.number - b.number);
    
    // For single elimination bracket logic:
    // Round 1: Matches 1,2,3,4 -> Round 2: Matches 1,2 (Semi 1, Semi 2)
    // Match 1 & 2 feed into Semi 1, Match 3 & 4 feed into Semi 2
    const semiMatchIndex = Math.floor((completedMatch.number - 1) / 2);
    
    console.log(`Match ${completedMatch.number} should feed into semi match at index ${semiMatchIndex}`);
    
    if (semiMatchIndex >= sortedNextRoundMatches.length) {
      console.log(`❌ Semi match index ${semiMatchIndex} is out of bounds for ${sortedNextRoundMatches.length} matches`);
      return;
    }
    
    const targetSemiMatch = sortedNextRoundMatches[semiMatchIndex];
    console.log('✅ Target semi match:', targetSemiMatch);
    
    // Determine which position (opponent1 or opponent2) this winner should take
    // Within each pair: first match -> opponent1, second match -> opponent2
    const isFirstInPair = (completedMatch.number - 1) % 2 === 0;
    const targetPosition = isFirstInPair ? 'opponent1' : 'opponent2';
    
    console.log(`📍 Match ${completedMatch.number} is ${isFirstInPair ? 'first' : 'second'} in pair`);
    console.log(`🎯 Advancing winner ${winnerId} to ${targetPosition} of match ${targetSemiMatch.id}`);
    
    // Check if this position is already occupied
    if (targetSemiMatch[targetPosition]?.id) {
      console.log(`⚠️ Position ${targetPosition} already occupied by participant ${targetSemiMatch[targetPosition].id}`);
      return;
    }
    
    // Update the semi match with the winner
    console.log('🔧 About to update target match:', targetSemiMatch.id);
    console.log('🔧 Target position:', targetPosition);
    console.log('🔧 Winner ID:', winnerId);
    
    const updateData: any = {};
    updateData[targetPosition] = {
      id: winnerId,
      position: null,
      result: null,
      score: null
    };
    
    console.log('🔧 Update data:', updateData);
    
    const updateResult = await this.storage.update('match', targetSemiMatch.id, updateData);
    console.log('✅ Storage update result:', updateResult);
    
    // Check the updated state
    const updatedMatch = await this.storage.select('match', targetSemiMatch.id);
    if (updatedMatch && updatedMatch[0]) {
      const match = updatedMatch[0];
      console.log('✅ Updated match state:', match);
      console.log('🔍 Updated match opponent1:', match.opponent1);
      console.log('🔍 Updated match opponent2:', match.opponent2);
      
      // If both opponents are now present, set to ready
      if (match.opponent1?.id && match.opponent2?.id && match.status === 0) {
        console.log(`🚀 Setting match ${match.id} to ready status (both opponents present)`);
        await this.storage.update('match', match.id, { status: 2 }); // ready
      } else {
        console.log(`⏳ Match ${match.id} still waiting (opponent1: ${match.opponent1?.id}, opponent2: ${match.opponent2?.id}, status: ${match.status})`);
      }
    }
    
    console.log('=== WINNER ADVANCEMENT COMPLETED ===');
    
    // Debug: Print all matches after advancement
    const allMatchesAfter = await this.storage.select('match');
    console.log('🏆 ALL MATCHES AFTER ADVANCEMENT:');
    allMatchesAfter.forEach((m: any) => {
      console.log(`Match ${m.id} (Round ${m.round_id}):`, {
        number: m.number,
        status: m.status,
        opponent1: m.opponent1,
        opponent2: m.opponent2
      });
    });
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