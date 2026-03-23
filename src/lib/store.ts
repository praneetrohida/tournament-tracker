/* eslint-disable @typescript-eslint/no-explicit-any */
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { TournamentManager, type TournamentPlayer, type TournamentSettings } from './tournamentManager';

// Tournament Manager instance
const tournamentManager = new TournamentManager();

// Basic tournament settings
export const playersAtom = atomWithStorage<TournamentPlayer[]>('tournament-players', []);
export const excludedPlayerIdsAtom = atomWithStorage<string[]>('excluded-player-ids', []);

// Player lifetime stats keyed by player name
export interface PlayerStats {
  wins: number;
  totalPoints: number;
}
export const playerStatsAtom = atomWithStorage<Record<string, PlayerStats>>('player-stats', {});
export const tournamentSettingsAtom = atomWithStorage<TournamentSettings>('tournament-settings', {
  type: 'single_elimination',
  gameType: 'singles',
  randomizePlayers: false
});

// App view state: replaces simple boolean with multi-screen navigation
export type AppView = 'setup' | 'bracket' | 'scoring' | 'podium';
export const appViewAtom = atomWithStorage<AppView>('app-view', 'setup');

// Tournament state
export const tournamentCreatedAtom = atomWithStorage<boolean>('tournament-created', false);
export const tournamentDataAtom = atom<any>(null);

// Active match being scored
export const activeMatchAtom = atom<any>(null);

// Match score state for the scoring screen
export interface MatchScoreState {
  player1Score: number;
  player2Score: number;
  selectedWinner: 'player1' | 'player2' | null;
}
export const matchScoresAtom = atom<MatchScoreState>({
  player1Score: 0,
  player2Score: 0,
  selectedWinner: null,
});

// Derived atoms
export const isSetupCompleteAtom = atom(
  (get) => {
    const players = get(playersAtom);
    return players.length >= 2;
  }
);

// Actions
export const createTournamentAtom = atom(
  null,
  async (get, set, players?: TournamentPlayer[]) => {
    const originalPlayers = players ?? get(playersAtom);
    const settings = get(tournamentSettingsAtom);

    if (originalPlayers.length < 2) {
      throw new Error('Need at least 2 players to create a tournament');
    }

    try {
      const playersToUse = [...originalPlayers];

      // Always randomize
      for (let i = playersToUse.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [playersToUse[i], playersToUse[j]] = [playersToUse[j], playersToUse[i]];
      }

      await tournamentManager.createTournament(playersToUse, settings);
      set(tournamentCreatedAtom, true);
      set(appViewAtom, 'bracket');

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
  async (get, set, { matchId, opponent1Score, opponent2Score }: {
    matchId: number;
    opponent1Score: number;
    opponent2Score: number;
  }) => {
    try {
      // Get participant names before update for stats tracking
      const activeMatch = get(activeMatchAtom);
      const currentData = await tournamentManager.getViewerData();
      const getNameById = (id: number | null) => {
        if (!id) return null;
        const p = currentData.participants.find((p: any) => p.id === id);
        return p?.name || null;
      };

      const p1Name = getNameById(activeMatch?.opponent1?.id);
      const p2Name = getNameById(activeMatch?.opponent2?.id);

      const updateResult = await tournamentManager.updateMatch(matchId, opponent1Score, opponent2Score);
      console.log('updateMatchAtom: match updated', updateResult);

      const data = await tournamentManager.getViewerData();
      const dataWithTimestamp = { ...data, _lastUpdated: Date.now() };

      // Update player stats
      const stats = { ...get(playerStatsAtom) };
      const winnerName = opponent1Score > opponent2Score ? p1Name : p2Name;

      // Helper to get individual names (handles doubles "A & B" format)
      const getIndividualNames = (name: string | null): string[] => {
        if (!name) return [];
        return name.includes(' & ') ? name.split(' & ') : [name];
      };

      // Credit points to all individuals
      for (const name of getIndividualNames(p1Name)) {
        if (!stats[name]) stats[name] = { wins: 0, totalPoints: 0 };
        stats[name].totalPoints += opponent1Score;
      }
      for (const name of getIndividualNames(p2Name)) {
        if (!stats[name]) stats[name] = { wins: 0, totalPoints: 0 };
        stats[name].totalPoints += opponent2Score;
      }
      // Credit win
      for (const name of getIndividualNames(winnerName)) {
        if (!stats[name]) stats[name] = { wins: 0, totalPoints: 0 };
        stats[name].wins += 1;
      }
      set(playerStatsAtom, stats);

      set(tournamentDataAtom, dataWithTimestamp);
      set(activeMatchAtom, null);
      set(matchScoresAtom, { player1Score: 0, player2Score: 0, selectedWinner: null });
      set(appViewAtom, 'bracket');

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
      set(appViewAtom, 'setup');
      set(activeMatchAtom, null);
      set(matchScoresAtom, { player1Score: 0, player2Score: 0, selectedWinner: null });

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

// Navigate to scoring screen for a specific match
export const startScoringAtom = atom(
  null,
  (_, set, match: any) => {
    set(activeMatchAtom, match);
    set(matchScoresAtom, { player1Score: 0, player2Score: 0, selectedWinner: null });
    set(appViewAtom, 'scoring');
  }
);

// Export the tournament manager for direct access if needed
export { tournamentManager };
