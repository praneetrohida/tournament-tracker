import { useAtom } from 'jotai';
import { Trophy, ArrowLeft, ChevronDown, ChevronUp, FastForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  matchesAtom,
  currentRoundAtom,
  currentMatchesAtom,
  tournamentTypeAtom,
  isSetupCompleteAtom,
} from '@/lib/store';
import type { Match, Team } from '@/lib/store';
import { useState, useMemo } from 'react';
// Import tournament logic
import {
  updateMatchWithWinner,
  getMatchesForRound,
  getAllRounds,
  isByeMatch,
  isTournamentComplete,
  getTournamentChampion,
  generateNextRoundMatches,
  advanceTournament,
  getTeamDisplay,
  getMatchTitle
} from '@/lib/tournament';

export function TournamentView() {
  const [matches, setMatches] = useAtom(matchesAtom);
  const [currentRound, setCurrentRound] = useAtom(currentRoundAtom);
  const [currentMatches] = useAtom(currentMatchesAtom);
  const [tournamentType] = useAtom(tournamentTypeAtom);
  const [, endTournament] = useAtom(isSetupCompleteAtom);
  const [showBracket, setShowBracket] = useState(false);

  // Sort the current matches to have bye matches at the end
  const sortedMatches = useMemo(() => {
    return [...currentMatches].sort((a, b) => {
      // If a is a bye match and b is not, a should come after b
      if (isByeMatch(a) && !isByeMatch(b)) return 1;
      // If a is not a bye match and b is, a should come before b
      if (!isByeMatch(a) && isByeMatch(b)) return -1;
      // Both are the same type, maintain original order
      return 0;
    });
  }, [currentMatches]);

  // Calculate all rounds and the max round (final round) once
  const { allRounds, maxRound } = useMemo(() => {
    const rounds = getAllRounds(matches);
    
    // Extract all unique teams from the tournament
    const uniqueTeamIds = new Set<string>();
    matches.forEach(match => {
      if (match.team1?.id) uniqueTeamIds.add(match.team1.id);
      if (match.team2?.id) uniqueTeamIds.add(match.team2.id);
    });
    
    const teamCount = uniqueTeamIds.size;
    
    // For a knockout tournament, max rounds = ceiling(log2(teamCount))
    // This is because each round reduces the number of teams by half
    const calculatedMaxRound = teamCount > 0 ? Math.ceil(Math.log2(teamCount)) : 0;
    
    return { 
      allRounds: rounds, 
      // If we can calculate it from team count, use that, otherwise fall back to current calculation
      maxRound: calculatedMaxRound || (rounds.length > 0 ? Math.max(...rounds) : 0)
    };
  }, [matches]);

  const handleWinner = (match: Match, winner: Team) => {
    // Update the current match with the winner using the extracted logic
    const updatedMatches = updateMatchWithWinner(matches, match.id, winner);
    
    // Get matches for the current round with updated winners
    const updatedCurrentRoundMatches = getMatchesForRound(updatedMatches, currentRound);
    
    // Check if all matches in the current round are complete
    const roundComplete = updatedCurrentRoundMatches.every(m => m.winner);
    
    if (roundComplete) {
      // Use the advanceTournament function to handle tournament advancement
      const { matches: finalMatches, nextRound } = advanceTournament(
        updatedMatches, 
        currentRound, 
        tournamentType
      );
      
      setMatches(finalMatches);
      
      // Only advance the round if it actually changed
      if (nextRound !== currentRound) {
        setCurrentRound(nextRound);
      }
    } else {
      // Just update matches if round is not complete yet
      setMatches(updatedMatches);
    }
  };

  // Check if tournament is complete using the extracted logic
  const isComplete = (): boolean => {
    return isTournamentComplete(matches, currentRound, tournamentType);
  };

  // Get the tournament champion using the extracted logic
  const getChampion = (): Team | null => {
    return getTournamentChampion(matches, currentRound, tournamentType);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {currentRound === maxRound ? "Final Round" : `Round ${currentRound}`}
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowBracket(!showBracket)}
            className="flex items-center gap-2"
          >
            {showBracket ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Hide Bracket
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                View Bracket
              </>
            )}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                End Tournament
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>End Tournament</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to end this tournament? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={endTournament}>
                  End Tournament
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {showBracket && (
        <Card>
          <CardHeader>
            <CardTitle>Tournament Bracket</CardTitle>
          </CardHeader>
          <CardContent>
            {tournamentType === 'double-elimination' ? (
              // Double elimination bracket view with winners and losers brackets
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Winners Bracket</h3>
                  <div className="overflow-x-auto">
                    <div className="flex gap-4 min-w-[600px]">
                      {allRounds.map((round: number) => {
                        // Get matches for this round in winners bracket
                        const roundMatches = matches
                          .filter(m => m.round === round && m.bracket === 'winners')
                          .sort((a, b) => {
                            if (isByeMatch(a) && !isByeMatch(b)) return 1;
                            if (!isByeMatch(a) && isByeMatch(b)) return -1;
                            return 0;
                          });

                        if (roundMatches.length === 0) return null;

                        // Check if this is the final round
                        const isFinalRound = round === maxRound;

                        return (
                          <div key={`winners-${round}`} className="flex-1">
                            <div className="font-medium text-center mb-2">
                              {isFinalRound ? "Final Round" : `Round ${round}`}
                            </div>
                            <div className="space-y-6">
                              {roundMatches.map((match: Match) => (
                                <div 
                                  key={match.id} 
                                  className={`border rounded-md p-2 ${match.round === currentRound ? 'border-primary' : 'border-muted'}`}
                                >
                                  <div className={`p-1 text-sm ${match.winner?.id === match.team1.id ? 'bg-primary/10 font-medium' : ''}`}>
                                    {getTeamDisplay(match.team1)}
                                  </div>
                                  <div className="h-px bg-border my-1"></div>
                                  {isByeMatch(match) ? (
                                    <div className="p-1 text-xs text-muted-foreground flex items-center justify-center gap-1">
                                      <FastForward className="h-3.5 w-3.5 text-primary" />
                                      <span>Automatic advance</span>
                                    </div>
                                  ) : (
                                    <div className={`p-1 text-sm ${match.winner?.id === match.team2.id ? 'bg-primary/10 font-medium' : ''}`}>
                                      {getTeamDisplay(match.team2)}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Losers Bracket</h3>
                  <div className="overflow-x-auto">
                    <div className="flex gap-4 min-w-[600px]">
                      {allRounds.map((round: number) => {
                        // Get matches for this round in losers bracket
                        const roundMatches = matches
                          .filter(m => m.round === round && m.bracket === 'losers')
                          .sort((a, b) => {
                            if (isByeMatch(a) && !isByeMatch(b)) return 1;
                            if (!isByeMatch(a) && isByeMatch(b)) return -1;
                            return 0;
                          });

                        if (roundMatches.length === 0) return null;

                        return (
                          <div key={`losers-${round}`} className="flex-1">
                            <div className="font-medium text-center mb-2">
                              {`Round ${round}`}
                            </div>
                            <div className="space-y-6">
                              {roundMatches.map((match: Match) => (
                                <div 
                                  key={match.id} 
                                  className={`border rounded-md p-2 ${match.round === currentRound ? 'border-primary' : 'border-muted'}`}
                                >
                                  <div className={`p-1 text-sm ${match.winner?.id === match.team1.id ? 'bg-primary/10 font-medium' : ''}`}>
                                    {getTeamDisplay(match.team1)}
                                  </div>
                                  <div className="h-px bg-border my-1"></div>
                                  {isByeMatch(match) ? (
                                    <div className="p-1 text-xs text-muted-foreground flex items-center justify-center gap-1">
                                      <FastForward className="h-3.5 w-3.5 text-primary" />
                                      <span>Automatic advance</span>
                                    </div>
                                  ) : (
                                    <div className={`p-1 text-sm ${match.winner?.id === match.team2.id ? 'bg-primary/10 font-medium' : ''}`}>
                                      {getTeamDisplay(match.team2)}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Finals</h3>
                  <div className="overflow-x-auto">
                    <div className="flex gap-4 min-w-[600px]">
                      {allRounds.map((round: number) => {
                        // Get matches for this round in finals
                        const roundMatches = matches
                          .filter(m => m.round === round && m.bracket === 'final')
                          .sort((a, b) => {
                            if (isByeMatch(a) && !isByeMatch(b)) return 1;
                            if (!isByeMatch(a) && isByeMatch(b)) return -1;
                            return 0;
                          });

                        if (roundMatches.length === 0) return null;

                        return (
                          <div key={`final-${round}`} className="flex-1">
                            <div className="font-medium text-center mb-2">
                              {roundMatches.length > 1 ? "Final Matches" : "Championship Match"}
                            </div>
                            <div className="space-y-6">
                              {roundMatches.map((match: Match) => (
                                <div 
                                  key={match.id} 
                                  className={`border rounded-md p-2 ${match.round === currentRound ? 'border-primary' : 'border-muted'}`}
                                >
                                  <div className={`p-1 text-sm ${match.winner?.id === match.team1.id ? 'bg-primary/10 font-medium' : ''}`}>
                                    {getTeamDisplay(match.team1)}
                                  </div>
                                  <div className="h-px bg-border my-1"></div>
                                  <div className={`p-1 text-sm ${match.winner?.id === match.team2.id ? 'bg-primary/10 font-medium' : ''}`}>
                                    {getTeamDisplay(match.team2)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Regular knockout bracket view
              <div className="overflow-x-auto">
                <div className="flex gap-4 min-w-[600px]">
                  {allRounds.map((round: number) => {
                    // Get matches for this round and sort them (bye matches at the bottom)
                    const roundMatches = getMatchesForRound(matches, round).sort((a, b) => {
                      // If a is a bye match and b is not, a should come after b
                      if (isByeMatch(a) && !isByeMatch(b)) return 1;
                      // If a is not a bye match and b is, a should come before b
                      if (!isByeMatch(a) && isByeMatch(b)) return -1;
                      // Both are the same type, maintain original order
                      return 0;
                    });

                    // Check if this is the final round
                    const isFinalRound = round === maxRound;

                    return (
                      <div key={round} className="flex-1">
                        <div className="font-medium text-center mb-2">
                          {isFinalRound ? "Final Round" : `Round ${round}`}
                        </div>
                        <div className="space-y-6">
                          {roundMatches.map((match: Match) => (
                            <div 
                              key={match.id} 
                              className={`border rounded-md p-2 ${match.round === currentRound ? 'border-primary' : 'border-muted'}`}
                            >
                              <div className={`p-1 text-sm ${match.winner?.id === match.team1.id ? 'bg-primary/10 font-medium' : ''}`}>
                                {getTeamDisplay(match.team1)}
                              </div>
                              <div className="h-px bg-border my-1"></div>
                              {isByeMatch(match) ? (
                                <div className="p-1 text-xs text-muted-foreground flex items-center justify-center gap-1">
                                  <FastForward className="h-3.5 w-3.5 text-primary" />
                                  <span>Automatic advance</span>
                                </div>
                              ) : (
                                <div className={`p-1 text-sm ${match.winner?.id === match.team2.id ? 'bg-primary/10 font-medium' : ''}`}>
                                  {getTeamDisplay(match.team2)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isComplete() ? (
        <Card className="col-span-2">
          <CardContent className="py-8 text-center">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <h3 className="text-2xl font-bold mb-2">Tournament Champion!</h3>
            <div className="bg-primary/10 py-3 px-4 rounded-md inline-block mx-auto mb-3">
              <p className="text-xl font-bold">{getChampion() ? getTeamDisplay(getChampion()!) : ''}</p>
            </div>
            <p className="text-muted-foreground">
              Click "End Tournament" to start a new one
            </p>
          </CardContent>
        </Card>
      ) : currentMatches.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Trophy className="h-8 w-8 mx-auto mb-4" />
            <h3 className="text-xl font-bold">Tournament Complete!</h3>
            <p className="text-muted-foreground mt-2">
              Click "End Tournament" to start a new one
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sortedMatches.map((match) => (
            <Card key={match.id} className="w-full">
              <CardHeader>
                <CardTitle className="text-lg">{getMatchTitle(match)}</CardTitle>
              </CardHeader>
              <CardContent>
                {isByeMatch(match) ? (
                  <div className="py-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <FastForward className="h-5 w-5 text-primary" />
                      <span className="text-primary font-medium">Bye Match</span>
                    </div>
                    <p className="text-muted-foreground">
                      {getTeamDisplay(match.team1)} advances automatically
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Button
                        variant={match.winner?.id === match.team1.id ? "default" : "outline"}
                        className="justify-start w-full"
                        onClick={() => handleWinner(match, match.team1)}
                        disabled={!!match.winner}
                      >
                        {match.winner?.id === match.team1.id && (
                          <Trophy className="h-4 w-4 mr-2" />
                        )}
                        {getTeamDisplay(match.team1)}
                      </Button>
                      <Button
                        variant={match.winner?.id === match.team2.id ? "default" : "outline"}
                        className="justify-start w-full"
                        onClick={() => handleWinner(match, match.team2)}
                        disabled={!!match.winner}
                      >
                        {match.winner?.id === match.team2.id && (
                          <Trophy className="h-4 w-4 mr-2" />
                        )}
                        {getTeamDisplay(match.team2)}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}