/* eslint-disable @typescript-eslint/no-explicit-any */
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { TournamentManager, type TournamentPlayer, type TournamentSettings } from './tournamentManager';

// Tournament Manager instance
const tournamentManager = new TournamentManager();

// Basic tournament settings
export const playersAtom = atomWithStorage<TournamentPlayer[]>('tournament-players', []);
export const tournamentSettingsAtom = atomWithStorage<TournamentSettings>('tournament-settings', {
  type: 'single_elimination',
  gameType: 'singles'
});

// Tournament state
export const tournamentCreatedAtom = atomWithStorage<boolean>('tournament-created', false);
export const tournamentDataAtom = atom<any>(null);

// Derived atoms
export const isSetupCompleteAtom = atom(
  (get) => {
    const players = get(playersAtom);
    return players.length >= 2; // Need at least 2 players for a tournament
  }
);

// Actions
export const createTournamentAtom = atom(
  null,
  async (get, set, randomizePlayers: boolean = false) => {
    const originalPlayers = get(playersAtom);
    const settings = get(tournamentSettingsAtom);
    
    if (originalPlayers.length < 2) {
      throw new Error('Need at least 2 players to create a tournament');
    }

    try {
      // Create a copy of players and optionally randomize
      const playersToUse = [...originalPlayers];
      
      if (randomizePlayers) {
        // Fisher-Yates shuffle algorithm - only for tournament creation
        for (let i = playersToUse.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [playersToUse[i], playersToUse[j]] = [playersToUse[j], playersToUse[i]];
        }
        console.log('Players randomized for tournament:', playersToUse.map(p => p.name));
      }

      await tournamentManager.createTournament(playersToUse, settings);
      set(tournamentCreatedAtom, true);
      
      // Get initial tournament data
      const data = await tournamentManager.getViewerData();
      const dataWithTimestamp = {
        ...data,
        _lastUpdated: Date.now()
      };
      set(tournamentDataAtom, dataWithTimestamp);
      
      return true;
    } catch (error) {
      console.error('Failed to create tournament:', error);
      throw error;
    }
  }
);

export const updateMatchAtom = atom(
  null,
  async (_, set, { matchId, opponent1Score, opponent2Score }: { 
    matchId: number; 
    opponent1Score: number; 
    opponent2Score: number; 
  }) => {
    try {
      console.log('updateMatchAtom: Starting match update', { matchId, opponent1Score, opponent2Score });
      
      const updateResult = await tournamentManager.updateMatch(matchId, opponent1Score, opponent2Score);
      console.log('updateMatchAtom: TournamentManager.updateMatch result:', updateResult);
      
      // Refresh tournament data
      console.log('updateMatchAtom: Refreshing tournament data...');
      const data = await tournamentManager.getViewerData();
      console.log('updateMatchAtom: New tournament data:', data);
      
      // Add timestamp to ensure the object reference changes and triggers re-renders
      const dataWithTimestamp = {
        ...data,
        _lastUpdated: Date.now()
      };
      
      set(tournamentDataAtom, dataWithTimestamp);
      console.log('updateMatchAtom: Tournament data atom updated with timestamp');
      
      return true;
    } catch (error) {
      console.error('updateMatchAtom: Failed to update match:', error);
      throw error;
    }
  }
);

export const resetTournamentAtom = atom(
  null,
  async (_, set) => {
    try {
      await tournamentManager.resetTournament();
      set(tournamentCreatedAtom, false);
      set(tournamentDataAtom, null);
      
      return true;
    } catch (error) {
      console.error('Failed to reset tournament:', error);
      throw error;
    }
  }
);

export const refreshTournamentDataAtom = atom(
  null,
  async (_, set) => {
    try {
      const data = await tournamentManager.getViewerData();
      const dataWithTimestamp = {
        ...data,
        _lastUpdated: Date.now()
      };
      set(tournamentDataAtom, dataWithTimestamp);
      return dataWithTimestamp;
    } catch (error) {
      console.error('Failed to refresh tournament data:', error);
      throw error;
    }
  }
);

// Export the tournament manager for direct access if needed
export { tournamentManager }; 