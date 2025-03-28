import { Team, Match, TournamentType, GameType } from './types';

/**
 * Generates teams from a list of players based on the game type (singles or doubles)
 */
export const generateTeams = (
  players: { id: string; name: string }[],
  gameType: GameType,
  randomizePlayers = false
): Team[] => {
  // Clone players to avoid modifying the original array
  let playersCopy = [...players];
  
  // Randomize if requested
  if (randomizePlayers) {
    playersCopy = playersCopy
      .map(player => ({ player, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ player }) => player);
  }
  
  const teams: Team[] = [];
  
  if (gameType === 'singles') {
    // Create one team per player for singles
    playersCopy.forEach(player => {
      teams.push({
        id: crypto.randomUUID(),
        players: [player],
      });
    });
  } else {
    // Create teams of two players for doubles
    for (let i = 0; i < playersCopy.length; i += 2) {
      if (i + 1 < playersCopy.length) {
        teams.push({
          id: crypto.randomUUID(),
          players: [playersCopy[i], playersCopy[i + 1]],
        });
      } else {
        // If there's an odd number of players, the last player is paired with a "placeholder"
        // This is a rare case and could be handled differently based on requirements
        teams.push({
          id: crypto.randomUUID(),
          players: [playersCopy[i]],
        });
      }
    }
  }
  
  return teams;
};

/**
 * Creates seeded positions in a bracket based on the size of the tournament
 */
export const createSeededPositions = (teamCount: number): number[] => {
  // Find the next power of 2 greater than or equal to teamCount
  let nextPowerOfTwo = 1;
  while (nextPowerOfTwo < teamCount) {
    nextPowerOfTwo *= 2;
  }
  
  // Create the seeded positions based on the standard tournament seeding pattern
  const positions: number[] = [];
  let round = 1;
  
  // Implement a standard tournament seeding algorithm
  // For power of 2, this creates the standard 1 vs 16, 8 vs 9, etc. pattern
  // For non-power of 2, some positions will need byes
  for (let i = 0; i < nextPowerOfTwo; i++) {
    // This creates pairs like [0, nextPowerOfTwo-1], [1, nextPowerOfTwo-2], etc.
    if (round % 2 === 1) {
      positions.push(Math.floor(i / 2));
    } else {
      positions.push(nextPowerOfTwo - 1 - Math.floor(i / 2));
    }
    round++;
  }
  
  return positions;
};

/**
 * Generates matches for a tournament based on teams and tournament type
 */
export const generateMatches = (
  teams: Team[],
  tournamentType: TournamentType
): Match[] => {
  if (tournamentType === 'knockout') {
    return generateKnockoutMatches(teams);
  } else if (tournamentType === 'double-elimination') {
    return generateDoubleEliminationMatches(teams);
  } else {
    // Default to knockout if no valid tournament type is provided
    return generateKnockoutMatches(teams);
  }
};

/**
 * Generates matches for a knockout tournament
 */
const generateKnockoutMatches = (teams: Team[]): Match[] => {
  const matches: Match[] = [];
  
  // Early return for empty teams
  if (teams.length === 0) return matches;
  
  // Create seeded positions for the teams
  const positions = createSeededPositions(teams.length);
  
  // Create an array of team positions, with null for positions beyond the team count
  const teamsWithByes: (Team | null)[] = Array(positions.length).fill(null);
  for (let i = 0; i < teams.length; i++) {
    teamsWithByes[positions[i]] = teams[i];
  }
  
  // Generate first round matches based on the seeded positions
  for (let i = 0; i < teamsWithByes.length; i += 2) {
    const team1 = teamsWithByes[i];
    const team2 = teamsWithByes[i + 1];
    
    if (team1 === null && team2 === null) {
      // Skip if both positions are empty (should not happen in normal scenarios)
      continue;
    } else if (team1 === null) {
      // Bye for team2
      matches.push({
        id: crypto.randomUUID(),
        team1: team2!,
        team2: team2!,
        round: 1,
        winner: team2!, // Auto-win for bye, add non-null assertion
      });
    } else if (team2 === null) {
      // Bye for team1
      matches.push({
        id: crypto.randomUUID(),
        team1: team1,
        team2: team1,
        round: 1,
        winner: team1, // Auto-win for bye
      });
    } else {
      // Regular match between two teams
      matches.push({
        id: crypto.randomUUID(),
        team1: team1,
        team2: team2,
        round: 1,
      });
    }
  }
  
  return matches;
};

/**
 * Generates matches for a double-elimination tournament
 * This creates a winners bracket and a losers bracket
 */
const generateDoubleEliminationMatches = (teams: Team[]): Match[] => {
  // Start with the winners bracket, which is identical to a knockout bracket
  const winnersBracketMatches = generateKnockoutMatches(teams).map(match => ({
    ...match,
    bracket: 'winners' as const
  }));
  
  // We don't generate the losers bracket matches upfront as they depend on winners bracket results
  // They will be generated as the tournament progresses
  
  return winnersBracketMatches;
};

/**
 * Updates a match with the winner
 */
export const updateMatchWithWinner = (
  matches: Match[],
  matchId: string,
  winner: Team
): Match[] => {
  return matches.map(match => {
    if (match.id === matchId) {
      return { ...match, winner };
    }
    return match;
  });
};

/**
 * Gets matches for a specific round
 */
export const getMatchesForRound = (
  matches: Match[],
  round: number
): Match[] => {
  return matches.filter(match => match.round === round);
};

/**
 * Gets all unique rounds present in the matches
 */
export const getAllRounds = (matches: Match[]): number[] => {
  const rounds = matches.map(match => match.round);
  return [...new Set(rounds)].sort((a, b) => a - b);
};

/**
 * Checks if a match is a bye match (same team on both sides)
 */
export const isByeMatch = (match: Match): boolean => {
  return match.team1.id === match.team2.id;
};

/**
 * Generates matches for the next round based on the winners of the current round
 */
export const generateNextRoundMatches = (
  matches: Match[],
  currentRound: number
): Match[] => {
  // Get all matches for the current round
  const currentRoundMatches = getMatchesForRound(matches, currentRound);
  
  // Check if all matches have winners
  const allMatchesHaveWinners = currentRoundMatches.every(match => match.winner);
  if (!allMatchesHaveWinners) {
    return [];
  }
  
  // Get winners from the current round
  const winners = currentRoundMatches.map(match => match.winner!);
  
  // If there's only one winner, the tournament is complete
  if (winners.length === 1) {
    return [];
  }
  
  // Generate next round matches
  const nextRound = currentRound + 1;
  const nextRoundMatches: Match[] = [];
  
  for (let i = 0; i < winners.length; i += 2) {
    if (i + 1 < winners.length) {
      // Regular match between two winners
      nextRoundMatches.push({
        id: crypto.randomUUID(),
        team1: winners[i],
        team2: winners[i + 1],
        round: nextRound,
      });
    } else if (winners.length % 2 !== 0) {
      // If there's an odd number of winners, the last one gets a bye
      nextRoundMatches.push({
        id: crypto.randomUUID(),
        team1: winners[i],
        team2: winners[i], // Same team for bye match
        round: nextRound,
        winner: winners[i], // Auto-win for bye
      });
    }
  }
  
  return nextRoundMatches;
};

/**
 * Calculates the expected number of rounds based on team count
 */
export const calculateExpectedRounds = (teamCount: number): number => {
  if (teamCount <= 1) return 0;
  
  // Find the smallest power of 2 that's >= teamCount
  let nextPowerOfTwo = 1;
  let rounds = 0;
  
  while (nextPowerOfTwo < teamCount) {
    nextPowerOfTwo *= 2;
    rounds++;
  }
  
  return rounds;
};

/**
 * Checks if the tournament is complete
 */
export const isTournamentComplete = (
  matches: Match[],
  currentRound: number,
  tournamentType: TournamentType
): boolean => {
  if (tournamentType === 'knockout') {
    // For knockout: check if we have a final match with a winner
    const currentRoundMatches = getMatchesForRound(matches, currentRound);
    
    // If there's only one match in the current round and it has a winner, tournament is complete
    if (currentRoundMatches.length === 1 && currentRoundMatches[0].winner) {
      return true;
    }
    
    // Or if we've played all rounds and all matches have winners
    const rounds = getAllRounds(matches);
    const maxRound = Math.max(...rounds);
    const finalRoundMatches = getMatchesForRound(matches, maxRound);
    
    return finalRoundMatches.length === 1 && finalRoundMatches[0].winner !== undefined;
  } else if (tournamentType === 'double-elimination') {
    // For double-elimination: check if we have a final match with a winner
    const finalMatches = matches.filter(match => match.bracket === 'final');
    
    if (finalMatches.length > 0) {
      // There can be 1 or 2 final matches depending on who wins the first final
      if (finalMatches.length === 1) {
        return finalMatches[0].winner !== undefined;
      } else if (finalMatches.length === 2) {
        return finalMatches[1].winner !== undefined;
      }
    }
    
    return false;
  } else {
    // Default case (should never reach here if TournamentType is properly typed)
    return false;
  }
};

/**
 * Gets the tournament champion
 */
export const getTournamentChampion = (
  matches: Match[],
  currentRound: number,
  tournamentType: TournamentType
): Team | null => {
  if (!isTournamentComplete(matches, currentRound, tournamentType)) {
    return null;
  }
  
  if (tournamentType === 'knockout') {
    // For knockout: the winner of the final match is the champion
    const rounds = getAllRounds(matches);
    const maxRound = Math.max(...rounds);
    const finalRoundMatches = getMatchesForRound(matches, maxRound);
    
    if (finalRoundMatches.length === 1 && finalRoundMatches[0].winner) {
      return finalRoundMatches[0].winner;
    }
  } else if (tournamentType === 'double-elimination') {
    // For double-elimination: the winner of the last final match is the champion
    const finalMatches = matches.filter(match => match.bracket === 'final');
    
    if (finalMatches.length > 0) {
      if (finalMatches.length === 1 && finalMatches[0].winner) {
        return finalMatches[0].winner;
      } else if (finalMatches.length === 2 && finalMatches[1].winner) {
        return finalMatches[1].winner;
      }
    }
  }
  
  return null;
};

/**
 * Advances the tournament to the next round
 */
export const advanceTournament = (
  matches: Match[],
  currentRound: number,
  tournamentType: TournamentType
): { matches: Match[]; nextRound: number } => {
  if (tournamentType === 'knockout') {
    // For knockout, we use the existing logic
    // Get matches for the current round
    const currentRoundMatches = getMatchesForRound(matches, currentRound);
    
    // Check if all matches in the current round have winners
    const allMatchesHaveWinners = currentRoundMatches.every(match => match.winner);
    
    if (!allMatchesHaveWinners) {
      // Not all matches have winners, can't advance yet
      return { matches, nextRound: currentRound };
    }
    
    // Check if tournament is already complete
    if (isTournamentComplete(matches, currentRound, tournamentType)) {
      return { matches, nextRound: currentRound };
    }
    
    // Generate matches for the next round
    const nextRoundMatches = generateNextRoundMatches(matches, currentRound);
    
    if (nextRoundMatches.length === 0) {
      // No new matches generated, likely the tournament is complete
      return { matches, nextRound: currentRound };
    }
    
    // Combine existing matches with new ones
    const updatedMatches = [...matches, ...nextRoundMatches];
    
    return {
      matches: updatedMatches,
      nextRound: currentRound + 1
    };
  } else if (tournamentType === 'double-elimination') {
    // For double-elimination, we need to handle winners and losers brackets
    
    // Get all matches from the current round, separated by bracket
    const currentWinnersMatches = matches.filter(m => m.round === currentRound && m.bracket === 'winners');
    const currentLosersMatches = matches.filter(m => m.round === currentRound && m.bracket === 'losers');
    const currentFinalMatches = matches.filter(m => m.round === currentRound && m.bracket === 'final');
    
    // Check if all current matches have winners
    const allWinnersHaveResults = currentWinnersMatches.every(m => m.winner);
    const allLosersHaveResults = currentLosersMatches.every(m => m.winner);
    const allFinalsHaveResults = currentFinalMatches.every(m => m.winner);
    
    // If not all matches have results, we can't advance
    if (
      (currentWinnersMatches.length > 0 && !allWinnersHaveResults) ||
      (currentLosersMatches.length > 0 && !allLosersHaveResults) ||
      (currentFinalMatches.length > 0 && !allFinalsHaveResults)
    ) {
      return { matches, nextRound: currentRound };
    }
    
    // Check if tournament is complete
    if (isTournamentComplete(matches, currentRound, tournamentType)) {
      return { matches, nextRound: currentRound };
    }
    
    let nextRoundMatches: Match[] = [];
    
    // Generate the next round of matches
    if (currentWinnersMatches.length > 0) {
      // Process winners bracket
      const winnersAdvancing = currentWinnersMatches
        .filter(m => m.winner)
        .map(m => m.winner!);
      
      // Create next round winners bracket matches if we have more than one winner
      if (winnersAdvancing.length > 1) {
        for (let i = 0; i < winnersAdvancing.length; i += 2) {
          if (i + 1 < winnersAdvancing.length) {
            nextRoundMatches.push({
              id: crypto.randomUUID(),
              team1: winnersAdvancing[i],
              team2: winnersAdvancing[i + 1],
              round: currentRound + 1,
              bracket: 'winners'
            });
          }
        }
      }
      
      // Create losers bracket matches for teams that lost in winners bracket
      const losersDropping = currentWinnersMatches
        .filter(m => m.winner && !isByeMatch(m)) // Exclude bye matches
        .map(m => m.winner!.id === m.team1.id ? m.team2 : m.team1);
      
      // Pair the losers for the losers bracket
      if (losersDropping.length > 0) {
        for (let i = 0; i < losersDropping.length; i += 2) {
          if (i + 1 < losersDropping.length) {
            nextRoundMatches.push({
              id: crypto.randomUUID(),
              team1: losersDropping[i],
              team2: losersDropping[i + 1],
              round: currentRound + 1,
              bracket: 'losers'
            });
          } else if (losersDropping.length === 1) {
            // If there's only one loser, they get a bye in the losers bracket
            nextRoundMatches.push({
              id: crypto.randomUUID(),
              team1: losersDropping[i],
              team2: losersDropping[i], // Same team for a bye
              round: currentRound + 1,
              bracket: 'losers',
              winner: losersDropping[i] // Auto-win for bye
            });
          }
        }
      }
    }
    
    if (currentLosersMatches.length > 0) {
      // Process losers bracket
      const losersAdvancing = currentLosersMatches
        .filter(m => m.winner)
        .map(m => m.winner!);
      
      // Create next round losers bracket matches
      if (losersAdvancing.length > 1) {
        for (let i = 0; i < losersAdvancing.length; i += 2) {
          if (i + 1 < losersAdvancing.length) {
            nextRoundMatches.push({
              id: crypto.randomUUID(),
              team1: losersAdvancing[i],
              team2: losersAdvancing[i + 1],
              round: currentRound + 1,
              bracket: 'losers'
            });
          }
        }
      }
    }
    
    // If we have one team left in winners and one in losers, create the final match
    const remainingWinners = matches
      .filter(m => m.bracket === 'winners' && m.winner)
      .map(m => m.winner!);
    
    const remainingLosers = matches
      .filter(m => m.bracket === 'losers' && m.winner)
      .map(m => m.winner!);
    
    const winnersBracketFinal = matches.find(
      m => m.bracket === 'winners' && 
           m.round === Math.max(...matches.filter(match => match.bracket === 'winners').map(match => match.round))
    );
    
    const losersBracketFinal = matches.find(
      m => m.bracket === 'losers' && 
           m.round === Math.max(...matches.filter(match => match.bracket === 'losers').map(match => match.round))
    );
    
    if (
      winnersBracketFinal?.winner && 
      losersBracketFinal?.winner && 
      !matches.some(m => m.bracket === 'final')
    ) {
      // Create the first final match
      nextRoundMatches.push({
        id: crypto.randomUUID(),
        team1: winnersBracketFinal.winner,
        team2: losersBracketFinal.winner,
        round: currentRound + 1,
        bracket: 'final'
      });
    }
    
    // Handle the second final match if needed (if losers bracket winner wins the first final)
    const firstFinal = matches.find(m => m.bracket === 'final');
    if (
      firstFinal?.winner && 
      firstFinal.winner.id === firstFinal.team2.id && // If the losers bracket winner won
      !matches.some(m => m.bracket === 'final' && m.id !== firstFinal.id) // No second final yet
    ) {
      // Create the second final match (true final)
      nextRoundMatches.push({
        id: crypto.randomUUID(),
        team1: firstFinal.team1, // Winners bracket finalist
        team2: firstFinal.team2, // Losers bracket finalist who won the first final
        round: currentRound + 1,
        bracket: 'final'
      });
    }
    
    // If no new matches were generated, stay on current round
    if (nextRoundMatches.length === 0) {
      return { matches, nextRound: currentRound };
    }
    
    // Combine existing matches with new ones
    const updatedMatches = [...matches, ...nextRoundMatches];
    
    return {
      matches: updatedMatches,
      nextRound: currentRound + 1
    };
  } else {
    // Default to no advancement for unknown tournament types
    return { matches, nextRound: currentRound };
  }
};

/**
 * Gets a human-readable display string for a team
 */
export const getTeamDisplay = (team: Team): string => {
  // Handle placeholder teams
  if (team.id.startsWith('placeholder-')) {
    return 'Winner of previous match';
  }
  return team.players.map((p) => p.name).join(' & ');
};

/**
 * Gets a title for a match
 */
export const getMatchTitle = (match: Match): string => {
  if (match.bracket === 'winners') {
    return `Winners Bracket - Round ${match.round}, Match ${match.id.substring(0, 4)}`;
  } else if (match.bracket === 'losers') {
    return `Losers Bracket - Round ${match.round}, Match ${match.id.substring(0, 4)}`;
  } else if (match.bracket === 'final') {
    return `Final Match ${match.id.substring(0, 4)}`;
  } else {
    return `Round ${match.round}, Match ${match.id.substring(0, 4)}`;
  }
}; 