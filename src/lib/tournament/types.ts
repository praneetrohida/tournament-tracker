import { Team, Match, TournamentType, GameType } from '@/lib/store';

// Re-export the types
export type { Team, Match, TournamentType, GameType };

// Define tournament-specific types
export interface TournamentState {
  teams: Team[];
  matches: Match[];
  currentRound: number;
  tournamentType: TournamentType;
}

export interface MatchResult {
  matchId: string;
  winnerId: string;
}

export interface RoundResult {
  round: number;
  matches: Match[];
  isComplete: boolean;
}

export interface TournamentSummary {
  totalTeams: number;
  totalRounds: number;
  currentRound: number;
  isComplete: boolean;
  champion: Team | null;
} 