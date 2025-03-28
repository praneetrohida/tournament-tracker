// Import Vitest testing utilities
import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';

// Import from the main index file
import {
  generateTeams,
  generateMatches,
  updateMatchWithWinner,
  isByeMatch,
  isTournamentComplete,
  getTournamentChampion,
  advanceTournament
} from '../../tournament';
import type { Team, Match } from '../../tournament';

describe('Tournament Logic', () => {
  // Mock crypto.randomUUID for predictable test output
  const originalRandomUUID = crypto.randomUUID;
  let uuidCounter = 0;
  
  beforeAll(() => {
    // @ts-ignore - mocking for testing purposes
    crypto.randomUUID = () => `test-uuid-${uuidCounter++}`;
  });
  
  afterAll(() => {
    // @ts-ignore - restore original
    crypto.randomUUID = originalRandomUUID;
  });
  
  // Reset counter before each test
  beforeEach(() => {
    uuidCounter = 0;
  });
  
  describe('generateTeams', () => {
    test('should generate singles teams', () => {
      const players = [
        { id: 'p1', name: 'Player 1' },
        { id: 'p2', name: 'Player 2' },
        { id: 'p3', name: 'Player 3' },
        { id: 'p4', name: 'Player 4' }
      ];
      
      const teams = generateTeams(players, 'singles', false);
      
      expect(teams.length).toBe(4);
      expect(teams[0].players.length).toBe(1);
      expect(teams[0].players[0].name).toBe('Player 1');
    });
    
    test('should generate doubles teams', () => {
      const players = [
        { id: 'p1', name: 'Player 1' },
        { id: 'p2', name: 'Player 2' },
        { id: 'p3', name: 'Player 3' },
        { id: 'p4', name: 'Player 4' }
      ];
      
      const teams = generateTeams(players, 'doubles', false);
      
      expect(teams.length).toBe(2);
      expect(teams[0].players.length).toBe(2);
      expect(teams[0].players[0].name).toBe('Player 1');
      expect(teams[0].players[1].name).toBe('Player 2');
    });
  });
  
  describe('generateMatches', () => {
    test('should generate knockout tournament matches', () => {
      const teams: Team[] = [
        { id: 't1', players: [{ id: 'p1', name: 'Player 1' }] },
        { id: 't2', players: [{ id: 'p2', name: 'Player 2' }] },
        { id: 't3', players: [{ id: 'p3', name: 'Player 3' }] },
        { id: 't4', players: [{ id: 'p4', name: 'Player 4' }] }
      ];
      
      const matches = generateMatches(teams, 'knockout');
      
      expect(matches.length).toBe(2); // 2 matches for 4 teams
      expect(matches[0].round).toBe(1);
      expect(matches[1].round).toBe(1);
    });
    
    test('should handle byes in knockout with non-power-of-2 team count', () => {
      const teams: Team[] = [
        { id: 't1', players: [{ id: 'p1', name: 'Player 1' }] },
        { id: 't2', players: [{ id: 'p2', name: 'Player 2' }] },
        { id: 't3', players: [{ id: 'p3', name: 'Player 3' }] }
      ];
      
      const matches = generateMatches(teams, 'knockout');
      
      // For 3 teams, we need 2 matches (one regular, one bye)
      expect(matches.length).toBe(2);
      
      // Find the bye match
      const byeMatch = matches.find((m) => m.team1.id === m.team2.id);
      expect(byeMatch).toBeDefined();
      expect(byeMatch?.winner).toBeDefined(); // Bye matches have an auto-winner
    });
  });
  
  describe('updateMatchWithWinner', () => {
    test('should update a match with a winner', () => {
      const matches: Match[] = [
        {
          id: 'match1',
          team1: { id: 't1', players: [{ id: 'p1', name: 'Player 1' }] },
          team2: { id: 't2', players: [{ id: 'p2', name: 'Player 2' }] },
          round: 1
        }
      ];
      
      const winner = { id: 't1', players: [{ id: 'p1', name: 'Player 1' }] };
      const updatedMatches = updateMatchWithWinner(matches, 'match1', winner);
      
      expect(updatedMatches[0].winner).toBe(winner);
    });
  });
  
  describe('isByeMatch', () => {
    test('should identify bye matches', () => {
      const byeMatch: Match = {
        id: 'match1',
        team1: { id: 't1', players: [{ id: 'p1', name: 'Player 1' }] },
        team2: { id: 't1', players: [{ id: 'p1', name: 'Player 1' }] },
        round: 1
      };
      
      const regularMatch: Match = {
        id: 'match2',
        team1: { id: 't1', players: [{ id: 'p1', name: 'Player 1' }] },
        team2: { id: 't2', players: [{ id: 'p2', name: 'Player 2' }] },
        round: 1
      };
      
      expect(isByeMatch(byeMatch)).toBe(true);
      expect(isByeMatch(regularMatch)).toBe(false);
    });
  });
  
  // Additional tests for tournament completion and champion detection
  describe('Tournament Completion and Champion', () => {
    test('should identify when a knockout tournament is not complete', () => {
      // Create teams
      const teams: Team[] = [
        { id: 't1', players: [{ id: 'p1', name: 'Player 1' }] },
        { id: 't2', players: [{ id: 'p2', name: 'Player 2' }] },
        { id: 't3', players: [{ id: 'p3', name: 'Player 3' }] },
        { id: 't4', players: [{ id: 'p4', name: 'Player 4' }] }
      ];
      
      // Generate matches
      const matches = generateMatches(teams, 'knockout');
      
      // Tournament should not be complete initially
      expect(isTournamentComplete(matches, 1, 'knockout')).toBe(false);
      
      // No champion should be available
      expect(getTournamentChampion(matches, 1, 'knockout')).toBeNull();
    });
    
    test('should identify when a knockout tournament is complete', () => {
      // Create teams
      const teams: Team[] = [
        { id: 't1', players: [{ id: 'p1', name: 'Player 1' }] },
        { id: 't2', players: [{ id: 'p2', name: 'Player 2' }] }
      ];
      
      // Generate matches - with just 2 teams, we'll have only 1 match in round 1
      const initialMatches = generateMatches(teams, 'knockout');
      expect(initialMatches.length).toBe(1);
      
      // Let's set a winner
      const winner = teams[0];
      const matchesWithWinner = updateMatchWithWinner(initialMatches, initialMatches[0].id, winner);
      
      // Tournament should now be complete since we have 1 match with a winner
      expect(isTournamentComplete(matchesWithWinner, 1, 'knockout')).toBe(true);
      
      // Champion should be the winner of the final match
      const champion = getTournamentChampion(matchesWithWinner, 1, 'knockout');
      expect(champion).toEqual(winner);
    });
    
    test('should advance tournament to next round', () => {
      // Create 4 teams for a 2-round tournament
      const teams: Team[] = [
        { id: 't1', players: [{ id: 'p1', name: 'Player 1' }] },
        { id: 't2', players: [{ id: 'p2', name: 'Player 2' }] },
        { id: 't3', players: [{ id: 'p3', name: 'Player 3' }] },
        { id: 't4', players: [{ id: 'p4', name: 'Player 4' }] }
      ];
      
      // Generate first round matches
      let matches = generateMatches(teams, 'knockout');
      expect(matches.length).toBe(2); // 2 matches in round 1
      
      // Set winners for round 1
      matches = updateMatchWithWinner(matches, matches[0].id, teams[0]);
      matches = updateMatchWithWinner(matches, matches[1].id, teams[2]);
      
      // Advance tournament
      const { matches: updatedMatches, nextRound } = advanceTournament(matches, 1, 'knockout');
      
      // Should create a new match and advance to round 2
      expect(nextRound).toBe(2);
      expect(updatedMatches.length).toBe(3); // 2 original + 1 new match
      expect(updatedMatches[2].round).toBe(2);
      expect(updatedMatches[2].team1).toBe(teams[0]); // First winner
      expect(updatedMatches[2].team2).toBe(teams[2]); // Second winner
    });
  });

  // Tests for double-elimination tournament
  describe('Double Elimination Tournament', () => {
    test('should generate initial matches for double-elimination tournament', () => {
      const teams: Team[] = [
        { id: 't1', players: [{ id: 'p1', name: 'Player 1' }] },
        { id: 't2', players: [{ id: 'p2', name: 'Player 2' }] },
        { id: 't3', players: [{ id: 'p3', name: 'Player 3' }] },
        { id: 't4', players: [{ id: 'p4', name: 'Player 4' }] }
      ];
      
      const matches = generateMatches(teams, 'double-elimination');
      
      // Should generate the same number of matches as a regular knockout for the first round
      expect(matches.length).toBe(2);
      // All matches should be in the winners bracket
      expect(matches.every(m => m.bracket === 'winners')).toBe(true);
      // All matches should be in round 1
      expect(matches.every(m => m.round === 1)).toBe(true);
    });
    
    test('should identify when a double-elimination tournament is not complete', () => {
      const teams: Team[] = [
        { id: 't1', players: [{ id: 'p1', name: 'Player 1' }] },
        { id: 't2', players: [{ id: 'p2', name: 'Player 2' }] }
      ];
      
      const matches = generateMatches(teams, 'double-elimination');
      expect(isTournamentComplete(matches, 1, 'double-elimination')).toBe(false);
    });
    
    test('should identify a double-elimination champion when tournament is complete', () => {
      const teams: Team[] = [
        { id: 't1', players: [{ id: 'p1', name: 'Player 1' }] },
        { id: 't2', players: [{ id: 'p2', name: 'Player 2' }] }
      ];
      
      // Create a simple final match to test champion identification
      const finalMatch: Match = {
        id: 'final-match',
        team1: teams[0],
        team2: teams[1],
        round: 2,
        bracket: 'final',
        winner: teams[0]
      };
      
      const matches = [finalMatch];
      
      expect(isTournamentComplete(matches, 2, 'double-elimination')).toBe(true);
      expect(getTournamentChampion(matches, 2, 'double-elimination')?.id).toBe(teams[0].id);
    });
  });
}); 