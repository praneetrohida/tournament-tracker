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
  randomizePlayers: boolean;
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

      // Debug: Show bracket structure
      console.log('=== BRACKET STRUCTURE ===');
      const groups = await this.storage.select('group');
      console.log('Groups:', groups);
      
      const rounds = await this.storage.select('round');
      console.log('Rounds:', rounds);
      
      // Organize matches by group and round for clarity
      const matchesByGroup = matches.reduce((acc: any, match: any) => {
        if (!acc[match.group_id]) acc[match.group_id] = {};
        if (!acc[match.group_id][match.round_id]) acc[match.group_id][match.round_id] = [];
        acc[match.group_id][match.round_id].push(match);
        return acc;
      }, {});
      
      Object.keys(matchesByGroup).forEach(groupId => {
        console.log(`Group ${groupId}:`);
        Object.keys(matchesByGroup[groupId]).forEach(roundId => {
          console.log(`  Round ${roundId}:`, matchesByGroup[groupId][roundId].map((m: any) => ({
            id: m.id,
            number: m.number,
            status: m.status,
            opponent1: m.opponent1?.id,
            opponent2: m.opponent2?.id
          })));
        });
      });
      console.log('=== END BRACKET STRUCTURE ===');

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
      
      // Determine winner
      const opponent1Wins = opponent1Score > opponent2Score;
      const winnerId = opponent1Wins ? match.opponent1?.id : match.opponent2?.id;
      const loserId = opponent1Wins ? match.opponent2?.id : match.opponent1?.id;
      
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
        // Let brackets-manager handle the advancement logic for both single and double elimination
        await this.manager.update.match(updateData);
        console.log('Match updated successfully via brackets-manager');
        
        // For double elimination, force manual advancement to ensure correct bracket progression
        const stage = await this.storage.select('stage');
        const tournamentType = stage[0]?.type;
        
        if (tournamentType === 'double_elimination') {
          console.log('🔧 Double elimination detected - applying manual advancement logic to ensure correct progression');
          await this.advancePlayersDoubleElimination(match, winnerId, loserId);
        }
        
      } catch (managerError) {
        console.warn('brackets-manager update failed, implementing manual advancement:', managerError);
        
        // Fallback: manually update the match and handle advancement
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
        
        // Manually advance players based on tournament type
        const stage = await this.storage.select('stage');
        const tournamentType = stage[0]?.type;
        
        if (tournamentType === 'double_elimination') {
          await this.advancePlayersDoubleElimination(match, winnerId, loserId);
        } else {
          await this.advancePlayersSingleElimination(match, winnerId);
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

  private async advancePlayersDoubleElimination(completedMatch: any, winnerId: number | null, loserId: number | null) {
    console.log('=== DOUBLE ELIMINATION ADVANCEMENT ===');
    console.log('Completed match:', completedMatch);
    console.log('Winner ID:', winnerId, 'Loser ID:', loserId);

    const allMatches = await this.storage.select('match');
    
    // Check if this is a grand final match
    if (completedMatch.group_id === 3) {
      console.log('Grand final match completed');
      await this.handleGrandFinalCompletion(completedMatch, winnerId, allMatches);
      return;
    }
    
    // Determine if this match is in winners bracket (group_id 1) or losers bracket (group_id 2)
    const isWinnersBracket = completedMatch.group_id === 1;
    console.log('Is winners bracket match:', isWinnersBracket);
    
    if (isWinnersBracket) {
      // Winner advances in winners bracket, loser goes to losers bracket
      await this.advanceWinnerInWinnersBracket(completedMatch, winnerId, allMatches);
      await this.advanceLoserToLosersBracket(completedMatch, loserId, allMatches);
    } else {
      // This is a losers bracket match - winner advances in losers bracket, loser is eliminated
      await this.advanceWinnerInLosersBracket(completedMatch, winnerId, allMatches);
    }
  }

  private async advanceWinnerInWinnersBracket(completedMatch: any, winnerId: number | null, allMatches: any[]) {
    if (!winnerId) return;
    
    console.log('Advancing winner in winners bracket...');
    console.log('Completed match round:', completedMatch.round_id);
    
    // Find next winners bracket match
    const nextWinnersBracketMatches = allMatches.filter(m => 
      m.group_id === 1 && // winners bracket
      m.round_id === completedMatch.round_id + 1
    );
    
    console.log('Next winners bracket matches found:', nextWinnersBracketMatches.length);
    
    if (nextWinnersBracketMatches.length === 0) {
      console.log('No next winners bracket match found - advancing to grand final');
      
      // Look for grand final match (group_id 3 or the highest group_id)
      const allGroups = [...new Set(allMatches.map(m => m.group_id))].sort((a, b) => b - a);
      const grandFinalGroupId = allGroups[0]; // Highest group ID should be grand final
      
      console.log('All group IDs:', allGroups);
      console.log('Grand final group ID:', grandFinalGroupId);
      
      const grandFinalMatches = allMatches.filter(m => m.group_id === grandFinalGroupId);
      console.log('Grand final matches:', grandFinalMatches);
      
      if (grandFinalMatches.length > 0) {
        const grandFinalMatch = grandFinalMatches[0];
        console.log('Placing winner in grand final match:', grandFinalMatch.id);
        
        // Winners bracket champion goes to opponent1 of grand final
        if (!grandFinalMatch.opponent1?.id) {
          await this.placePlayerInMatch(grandFinalMatch, winnerId, 'opponent1');
        } else if (!grandFinalMatch.opponent2?.id) {
          await this.placePlayerInMatch(grandFinalMatch, winnerId, 'opponent2');
        } else {
          console.log('Grand final match already full');
        }
      }
      return;
    }
    
    // Continue in winners bracket
    console.log('Advancing to next winners bracket round');
    const targetMatchIndex = Math.floor((completedMatch.number - 1) / 2);
    const targetMatch = nextWinnersBracketMatches.sort((a, b) => a.number - b.number)[targetMatchIndex];
    
    if (targetMatch) {
      const position = (completedMatch.number - 1) % 2 === 0 ? 'opponent1' : 'opponent2';
      console.log(`Placing winner in ${position} of match ${targetMatch.id}`);
      await this.placePlayerInMatch(targetMatch, winnerId, position);
    }
  }

  private async advanceLoserToLosersBracket(completedMatch: any, loserId: number | null, allMatches: any[]) {
    if (!loserId) return;
    
    console.log('Advancing loser to losers bracket...');
    console.log('Completed winners bracket match:', completedMatch);
    console.log('Loser ID:', loserId);
    
    // Get all losers bracket matches
    const losersBracketMatches = allMatches.filter(m => m.group_id === 2).sort((a, b) => a.round_id - b.round_id || a.number - b.number);
    console.log('All losers bracket matches:', losersBracketMatches);
    
    // Determine the maximum round in winners bracket to identify if this is the final
    const maxWinnersRound = Math.max(...allMatches.filter(m => m.group_id === 1).map(m => m.round_id));
    console.log('Max winners bracket round:', maxWinnersRound);
    console.log('Completed match round:', completedMatch.round_id);
    
    if (completedMatch.round_id === maxWinnersRound) {
      // This is the winners bracket final - loser goes to losers bracket final
      console.log('Loser from winners bracket final - placing in losers bracket final');
      
      // Find the losers bracket final (highest round in losers bracket)
      const maxLosersRound = Math.max(...losersBracketMatches.map(m => m.round_id));
      const losersBracketFinalMatches = losersBracketMatches.filter(m => m.round_id === maxLosersRound);
      
      console.log('Losers bracket final matches:', losersBracketFinalMatches);
      
      if (losersBracketFinalMatches.length > 0) {
        const finalMatch = losersBracketFinalMatches[0];
        // Place in the first available slot
        if (!finalMatch.opponent1?.id) {
          console.log('Placing WB final loser in opponent1 of LB final');
          await this.placePlayerInMatch(finalMatch, loserId, 'opponent1');
        } else if (!finalMatch.opponent2?.id) {
          console.log('Placing WB final loser in opponent2 of LB final');
          await this.placePlayerInMatch(finalMatch, loserId, 'opponent2');
        } else {
          console.log('LB final match already full');
        }
      }
      return;
    }
    
    // For other rounds, use the existing logic
    if (completedMatch.round_id === 1) {
      // Losers from first round of winners bracket go to first round of losers bracket
      const firstRoundLosersMatches = losersBracketMatches.filter(m => m.round_id === 1);
      console.log('First round losers bracket matches:', firstRoundLosersMatches);
      
      // Find appropriate match based on the completed match number
      // For a 4-player bracket: WB matches 1,2 feed into LB match 1
      const targetMatchIndex = Math.floor((completedMatch.number - 1) / 2);
      const targetMatch = firstRoundLosersMatches[targetMatchIndex];
      
      if (targetMatch) {
        console.log('Target losers bracket match:', targetMatch);
        // Determine position based on original winners bracket match
        const position = (completedMatch.number - 1) % 2 === 0 ? 'opponent1' : 'opponent2';
        console.log(`Placing loser ${loserId} in position ${position}`);
        await this.placePlayerInMatch(targetMatch, loserId, position);
      } else {
        console.log('No target match found, trying to find any available match');
        await this.findAndPlaceInAvailableLosersBracketMatch(loserId, losersBracketMatches);
      }
    } else {
      // Losers from later rounds go to later rounds in losers bracket
      // This is more complex and depends on the specific bracket structure
      console.log('Loser from later winners bracket round, finding appropriate position...');
      
      // Find the corresponding round in losers bracket
      // In double elimination, losers from WB round N typically go to LB round 2N-1 or similar
      const targetRound = (completedMatch.round_id - 1) * 2 + 1;
      const targetRoundMatches = losersBracketMatches.filter(m => m.round_id === targetRound);
      
      if (targetRoundMatches.length > 0) {
        const availableMatch = targetRoundMatches.find(m => !m.opponent1?.id || !m.opponent2?.id);
        if (availableMatch) {
          const position = !availableMatch.opponent1?.id ? 'opponent1' : 'opponent2';
          await this.placePlayerInMatch(availableMatch, loserId, position);
        }
      } else {
        console.log('No appropriate target round found, using fallback');
        await this.findAndPlaceInAvailableLosersBracketMatch(loserId, losersBracketMatches);
      }
    }
  }

  private async findAndPlaceInAvailableLosersBracketMatch(loserId: number, losersBracketMatches: any[]) {
    console.log('Finding any available losers bracket match for player:', loserId);
    
    // Sort by round and match number to ensure proper order
    const sortedMatches = losersBracketMatches.sort((a, b) => a.round_id - b.round_id || a.number - b.number);
    
    // Find the first match that has an empty slot
    for (const match of sortedMatches) {
      console.log(`Checking match ${match.id}:`, {
        round: match.round_id,
        number: match.number,
        opponent1: match.opponent1?.id,
        opponent2: match.opponent2?.id,
        status: match.status
      });
      
      if (!match.opponent1?.id) {
        console.log(`Placing player ${loserId} in opponent1 of match ${match.id}`);
        await this.placePlayerInMatch(match, loserId, 'opponent1');
        return;
      } else if (!match.opponent2?.id) {
        console.log(`Placing player ${loserId} in opponent2 of match ${match.id}`);
        await this.placePlayerInMatch(match, loserId, 'opponent2');
        return;
      }
    }
    
    console.log('No available losers bracket match found for player:', loserId);
  }

  private async advanceWinnerInLosersBracket(completedMatch: any, winnerId: number | null, allMatches: any[]) {
    if (!winnerId) return;
    
    console.log('Advancing winner in losers bracket...');
    
    // Find next losers bracket match or grand final
    const nextLosersBracketMatches = allMatches.filter(m => 
      m.group_id === 2 && // losers bracket
      m.round_id === completedMatch.round_id + 1
    );
    
    if (nextLosersBracketMatches.length === 0) {
      console.log('No next losers bracket match found - advancing to grand final');
      // Look for grand final match (group_id 3)
      const grandFinalMatches = allMatches.filter(m => m.group_id === 3);
      console.log('Grand final matches found:', grandFinalMatches);
      
      if (grandFinalMatches.length > 0) {
        // In double elimination, losers bracket champion goes to first grand final
        const firstGrandFinal = grandFinalMatches.sort((a, b) => a.round_id - b.round_id)[0];
        
        // Place in opponent2 (losers bracket champion position)
        if (!firstGrandFinal.opponent2?.id) {
          console.log('Placing LB champion in opponent2 of first grand final');
          await this.placePlayerInMatch(firstGrandFinal, winnerId, 'opponent2');
        } else {
          console.log('First grand final opponent2 already occupied');
        }
      }
      return;
    }
    
    // Advance to next losers bracket match
    const targetMatch = nextLosersBracketMatches.sort((a, b) => a.number - b.number)[0];
    if (targetMatch) {
      const position = !targetMatch.opponent1?.id ? 'opponent1' : 'opponent2';
      await this.placePlayerInMatch(targetMatch, winnerId, position);
    }
  }

  // Add method to handle grand final completion and bracket reset logic
  private async handleGrandFinalCompletion(completedMatch: any, winnerId: number | null, allMatches: any[]) {
    if (!winnerId) return;
    
    console.log('=== GRAND FINAL COMPLETION ===');
    console.log('Completed grand final match:', completedMatch);
    console.log('Winner ID:', winnerId);
    
    // Check if this is the first grand final and if winner is from losers bracket
    const grandFinalMatches = allMatches.filter(m => m.group_id === 3).sort((a, b) => a.round_id - b.round_id);
    const isFirstGrandFinal = completedMatch.id === grandFinalMatches[0]?.id;
    
    if (isFirstGrandFinal && grandFinalMatches.length > 1) {
      // Check if the winner came from losers bracket (was opponent2)
      const winnerIsFromLosersBracket = completedMatch.opponent2?.id === winnerId;
      
      console.log('Is first grand final:', isFirstGrandFinal);
      console.log('Winner is from losers bracket:', winnerIsFromLosersBracket);
      
      if (winnerIsFromLosersBracket) {
        // Bracket reset! Enable the second grand final
        console.log('🔄 BRACKET RESET! Enabling second grand final...');
        
        const secondGrandFinal = grandFinalMatches[1];
        if (secondGrandFinal && !secondGrandFinal.opponent1?.id && !secondGrandFinal.opponent2?.id) {
          // Move both players to the second grand final
          const losersBracketChampion = winnerId; // Winner of first GF
          const winnersBracketChampion = completedMatch.opponent1?.id; // Loser of first GF
          
          console.log('Placing both players in second grand final');
          await this.placePlayerInMatch(secondGrandFinal, winnersBracketChampion, 'opponent1');
          await this.placePlayerInMatch(secondGrandFinal, losersBracketChampion, 'opponent2');
        }
      } else {
        // Winners bracket champion won - tournament is over, disable second grand final
        console.log('🏆 Winners bracket champion won! Tournament complete.');
        
        // Optionally, we could mark the second grand final as unnecessary
        // But since the UI should handle this, we don't need to do anything special
      }
    }
    
    console.log('=== END GRAND FINAL COMPLETION ===');
  }

  private async advancePlayersSingleElimination(completedMatch: any, winnerId: number | null) {
    if (!winnerId) return;
    
    console.log('=== SINGLE ELIMINATION ADVANCEMENT ===');
    
    const allMatches = await this.storage.select('match');
    const nextRoundMatches = allMatches.filter(m => m.round_id === completedMatch.round_id + 1);
    
    if (nextRoundMatches.length === 0) {
      console.log('No next round found - tournament may be complete');
      return;
    }
    
    const targetMatchIndex = Math.floor((completedMatch.number - 1) / 2);
    const targetMatch = nextRoundMatches.sort((a, b) => a.number - b.number)[targetMatchIndex];
    
    if (targetMatch) {
      const position = (completedMatch.number - 1) % 2 === 0 ? 'opponent1' : 'opponent2';
      await this.placePlayerInMatch(targetMatch, winnerId, position);
    }
  }

  private async placePlayerInMatch(match: any, playerId: number, position: 'opponent1' | 'opponent2') {
    console.log(`Placing player ${playerId} in match ${match.id} as ${position}`);
    
    // Safety check: don't place the same player in both positions
    if (position === 'opponent1' && match.opponent2?.id === playerId) {
      console.log(`❌ Cannot place player ${playerId} as opponent1 - already in opponent2`);
      return;
    }
    if (position === 'opponent2' && match.opponent1?.id === playerId) {
      console.log(`❌ Cannot place player ${playerId} as opponent2 - already in opponent1`);
      return;
    }
    
    // Safety check: don't overwrite existing player
    if (position === 'opponent1' && match.opponent1?.id) {
      console.log(`❌ Cannot place player ${playerId} as opponent1 - position already occupied by ${match.opponent1.id}`);
      return;
    }
    if (position === 'opponent2' && match.opponent2?.id) {
      console.log(`❌ Cannot place player ${playerId} as opponent2 - position already occupied by ${match.opponent2.id}`);
      return;
    }
    
    const updateData: any = {};
    updateData[position] = {
      id: playerId,
      position: null,
      result: null,
      score: null
    };
    
    await this.storage.update('match', match.id, updateData);
    console.log(`✅ Successfully placed player ${playerId} in ${position} of match ${match.id}`);
    
    // Check if match is now ready (both opponents present)
    const updatedMatch = await this.storage.select('match', match.id);
    const matchData = updatedMatch[0];
    
    if (matchData.opponent1?.id && matchData.opponent2?.id && matchData.status === 0) {
      console.log(`🚀 Setting match ${match.id} to ready status (both opponents present)`);
      await this.storage.update('match', match.id, { status: 2 }); // ready
    } else {
      console.log(`⏳ Match ${match.id} not ready yet - opponent1: ${matchData.opponent1?.id}, opponent2: ${matchData.opponent2?.id}, status: ${matchData.status}`);
    }
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