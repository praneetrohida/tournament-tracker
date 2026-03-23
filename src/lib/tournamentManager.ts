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

      // Compute bracket size (nearest power of 2 >= participant count)
      const bracketSize = Math.pow(2, Math.ceil(Math.log2(Math.max(participantIds.length, 2))));

      // Build seeding array with null entries for BYE slots
      const seeding: (number | null)[] = [
        ...participantIds,
        ...Array(bracketSize - participantIds.length).fill(null)
      ];

      console.log('Bracket size:', bracketSize, 'Seeding:', seeding);

      // Create the tournament stage — brackets-manager handles BYE advancement natively
      const stage = await this.manager.create.stage({
        tournamentId: 1,
        name: `${settings.gameType === 'singles' ? 'Singles' : 'Doubles'} Tournament`,
        type: settings.type,
        seeding: seeding,
        settings: {
          grandFinal: settings.type === 'double_elimination' ? 'double' : 'none',
          size: bracketSize,
          balanceByes: true,
        },
      });

      console.log('Created stage:', stage);
      
      // Debug: Check what matches were created
      const matches = await this.storage.select('match') || [];
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
      // Get current match data
      const currentMatch = await this.storage.select('match', matchId);

      if (!currentMatch) {
        throw new Error(`Match with ID ${matchId} not found`);
      }

      if (currentMatch.status === 4) {
        throw new Error('Cannot update a completed match');
      }

      // Determine winner and let brackets-manager handle all advancement
      const opponent1Wins = opponent1Score > opponent2Score;

      await this.manager.update.match({
        id: matchId,
        opponent1: {
          score: opponent1Score,
          result: (opponent1Wins ? 'win' : 'loss') as 'win' | 'loss'
        },
        opponent2: {
          score: opponent2Score,
          result: (opponent1Wins ? 'loss' : 'win') as 'win' | 'loss'
        }
      });

      return true;
    } catch (error) {
      console.error('Error updating match:', error);
      throw error;
    }
  }

  async getMatches() {
    try {
      const matches = await this.storage.select('match');
      return matches || [];
    } catch (error) {
      console.error('Error getting matches:', error);
      return [];
    }
  }

  async getParticipants() {
    try {
      const participants = await this.storage.select('participant');
      return participants || [];
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