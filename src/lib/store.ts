import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export type Player = {
  id: string;
  name: string;
};

export type Team = {
  id: string;
  players: Player[];
};

export type Match = {
  id: string;
  team1: Team;
  team2: Team;
  winner?: Team;
  round: number;
};

export type TournamentType = 'classic' | 'knockout';
export type GameType = 'singles' | 'doubles';

export const playersAtom = atomWithStorage<Player[]>('players', []);
export const gameTypeAtom = atomWithStorage<GameType>('gameType', 'singles');
export const tournamentTypeAtom = atomWithStorage<TournamentType>('tournamentType', 'classic');
export const teamsAtom = atomWithStorage<Team[]>('teams', []);
export const matchesAtom = atomWithStorage<Match[]>('matches', []);
export const currentRoundAtom = atomWithStorage<number>('currentRound', 1);

// Derived atoms
export const isSetupCompleteAtom = atom(
  (get) => {
    const players = get(playersAtom);
    const teams = get(teamsAtom);
    return players.length > 0 && teams.length > 0;
  },
  (get, set) => {
    // Reset tournament
    set(teamsAtom, []);
    set(matchesAtom, []);
    set(currentRoundAtom, 1);
  }
);

export const currentMatchesAtom = atom((get) => {
  const matches = get(matchesAtom);
  const currentRound = get(currentRoundAtom);
  return matches.filter((match) => match.round === currentRound);
});