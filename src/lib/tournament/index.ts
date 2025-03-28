// Export everything from the tournament module
export * from './types';
export * from './logic';

// Main public API functions for the tournament module
export {
  generateTeams,
  generateMatches,
  updateMatchWithWinner,
  getMatchesForRound,
  getAllRounds,
  isByeMatch,
  isTournamentComplete,
  getTournamentChampion,
  advanceTournament,
  getTeamDisplay,
  getMatchTitle,
} from './logic'; 