/* eslint-disable @typescript-eslint/no-explicit-any */
import { useAtom } from 'jotai';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RotateCcw, Trophy, Crown, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  tournamentDataAtom, 
  updateMatchAtom, 
  resetTournamentAtom
} from '@/lib/store';

// Import brackets-viewer
declare global {
  interface Window {
    bracketsViewer: any;
  }
}

export const TournamentView = () => {
  const [tournamentData] = useAtom(tournamentDataAtom);
  const [, updateMatch] = useAtom(updateMatchAtom);
  const [, resetTournament] = useAtom(resetTournamentAtom);
  
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentMatch, setCurrentMatch] = useState<any>(null);
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [tournamentWinner, setTournamentWinner] = useState<string | null>(null);
  const [victoryShown, setVictoryShown] = useState(false); // Track if victory was already shown
  const confettiAnimationRef = useRef<number | null>(null); // Track confetti animation
  
  const bracketRef = useRef<HTMLDivElement>(null);

  // Auto-reset when tournament state is inconsistent
  useEffect(() => {
    // If we're on the tournament view but have no tournament data,
    // it means the state is inconsistent - reset to home screen
    if (!tournamentData || !tournamentData.matches || tournamentData.matches.length === 0) {
      console.log('Inconsistent tournament state detected - no data available, resetting...');
      const timer = setTimeout(async () => {
        try {
          await resetTournament();
          console.log('Tournament state reset due to missing data');
        } catch (error) {
          console.error('Failed to reset inconsistent tournament state:', error);
        }
      }, 1000); // Small delay to avoid immediate reset on initial load

      return () => clearTimeout(timer);
    }
  }, [tournamentData, resetTournament]);

  // Load brackets-viewer script
  useEffect(() => {
    const loadBracketsViewer = async () => {
      if (window.bracketsViewer) return;

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/brackets-viewer@1.6.2/dist/brackets-viewer.min.js';
      script.onload = () => {
        console.log('Brackets viewer loaded');
        renderBracket();
      };
      document.head.appendChild(script);

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/brackets-viewer@1.6.2/dist/brackets-viewer.min.css';
      document.head.appendChild(link);
    };

    loadBracketsViewer();
  }, []);

  // Render bracket when data changes
  useEffect(() => {
    if (window.bracketsViewer && tournamentData) {
      console.log('Tournament data changed, re-rendering bracket...', tournamentData);
      // Small delay to ensure DOM is ready and data is fully updated
      setTimeout(() => {
        renderBracket();
      }, 100);
    }
  }, [tournamentData]);

  const renderBracket = () => {
    if (!window.bracketsViewer || !bracketRef.current || !tournamentData) return;

    try {
      console.log('Rendering bracket with data:', tournamentData);
      
      // Clear existing bracket content before rendering new one
      if (bracketRef.current) {
        bracketRef.current.innerHTML = '';
      }
      
      // Process matches to include participant data for brackets-viewer
      const processedMatches = tournamentData.matches.map((match: any) => {
        const getParticipant = (opponentId: number | null) => {
          if (!opponentId) return null;
          return tournamentData.participants.find((p: any) => p.id === opponentId);
        };

        // Clean up null values for display
        const cleanOpponent = (opponent: any) => {
          if (!opponent) return opponent;
          return {
            ...opponent,
            // Remove null position to prevent "#null" prefixes
            position: opponent.position || undefined,
            // Convert null scores to undefined for cleaner display
            score: opponent.score === null ? undefined : opponent.score,
            participant: opponent.id ? getParticipant(opponent.id) : null
          };
        };

        return {
          ...match,
          opponent1: cleanOpponent(match.opponent1),
          opponent2: cleanOpponent(match.opponent2),
        };
      });

      window.bracketsViewer.render(
        {
          stages: tournamentData.stages,
          matches: processedMatches,
          matchGames: tournamentData.matchGames,
          participants: tournamentData.participants,
        },
        {
          selector: '#tournament-bracket',
          participantOriginPlacement: 'before',
          separatedChildCountLabel: true,
          showSlotsOrigin: true,
          showLowerBracketSlotsOrigin: true,
          highlightParticipantOnHover: true,
          onMatchClick: (match: any, info: any) => {
            console.log('Match clicked:', match);
            console.log('Click info:', info);
            console.log('Match status:', match.status);
            
            // Convert numeric status to string for comparison
            const getMatchStatus = (status: number) => {
              switch (status) {
                case 2: return 'ready';
                default: return 'not-ready';
              }
            };
            
            const stringStatus = getMatchStatus(match.status);
            if (stringStatus === 'ready') {
              // Simple approach: Always show the dialog for match clicks
              // Users can use the manual selection buttons below for direct winner selection
              setCurrentMatch(match);
              setSelectedMatch(match);
              setIsDialogOpen(true);
            } else {
              console.log('Match not ready, status:', match.status);
            }
          },
        }
      );
    } catch (error) {
      console.error('Error rendering bracket:', error);
    }
  };

  const handleResetTournament = async () => {
    if (confirm('Are you sure you want to end the tournament? This will delete all progress.')) {
      try {
        await resetTournament();
      } catch (error) {
        console.error('Failed to reset tournament:', error);
      }
    }
  };

  const handleSelectWinner = async (winner: number, match?: any) => {
    const targetMatch = match || currentMatch || selectedMatch;
    if (!targetMatch) return;

    try {
      console.log('Selecting winner:', winner, 'for match:', targetMatch);
      
      // Use scores to determine winner: winner gets 1, loser gets 0
      const opponent1Score = winner === 1 ? 1 : 0;
      const opponent2Score = winner === 2 ? 1 : 0;
      
      await updateMatch({
        matchId: targetMatch.id,
        opponent1Score,
        opponent2Score,
      });
      
      setIsDialogOpen(false);
      setSelectedMatch(null);
      setCurrentMatch(null);
      
      // The updateMatch atom already refreshes tournament data automatically
      // Just ensure the bracket re-renders with the updated data
      console.log('Match updated, bracket will re-render with new data...');
      
    } catch (error) {
      console.error('Failed to update match:', error);
    }
  };

  const handleCloseVictoryModal = () => {
    setShowVictoryModal(false);
    // Don't reset victoryShown here to prevent re-triggering
  };

  const stopConfetti = () => {
    if (confettiAnimationRef.current) {
      cancelAnimationFrame(confettiAnimationRef.current);
      confettiAnimationRef.current = null;
    }
  };

  const handleNewTournament = async () => {
    stopConfetti(); // Stop any running confetti
    setShowVictoryModal(false);
    setVictoryShown(false); // Reset for new tournament
    await resetTournament();
  };

  // Detect tournament completion and trigger victory celebration
  useEffect(() => {
    if (!tournamentData?.matches) return;

    // Find the final round (highest round_id)
    const maxRound = Math.max(...tournamentData.matches.map((m: any) => m.round_id));
    const finalMatches = tournamentData.matches.filter((m: any) => m.round_id === maxRound);
    
    // Check if any final match is completed
    const completedFinalMatch = finalMatches.find((m: any) => m.status === 4);
    
    if (completedFinalMatch && !showVictoryModal && !victoryShown) {
      // Determine the winner
      const winnerId = completedFinalMatch.opponent1?.result === 'win' 
        ? completedFinalMatch.opponent1?.id 
        : completedFinalMatch.opponent2?.id;
      
      if (winnerId) {
        const winner = tournamentData.participants.find((p: any) => p.id === winnerId);
        if (winner) {
          setTournamentWinner(winner.name);
          setShowVictoryModal(true);
          setVictoryShown(true);
          
          // Trigger confetti
          const duration = 3000;
          const end = Date.now() + duration;
          
          const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
          
          const frame = () => {
            // Check if animation should stop
            if (!confettiAnimationRef.current) return;
            
            confetti({
              particleCount: 2,
              angle: 60,
              spread: 55,
              origin: { x: 0 },
              colors: colors
            });
            confetti({
              particleCount: 2,
              angle: 120,
              spread: 55,
              origin: { x: 1 },
              colors: colors
            });

            if (Date.now() < end) {
              confettiAnimationRef.current = requestAnimationFrame(frame);
            } else {
              confettiAnimationRef.current = null;
            }
          };
          
          confettiAnimationRef.current = requestAnimationFrame(frame);
        }
      }
    }
  }, [tournamentData, showVictoryModal, victoryShown]);

  // Cleanup confetti animation on unmount
  useEffect(() => {
    return () => {
      stopConfetti();
    };
  }, []);

  if (!tournamentData || !tournamentData.matches || tournamentData.matches.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <div className="flex flex-col items-center gap-2">
            <Trophy className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-semibold">No Tournament Data Available</p>
            <p className="text-muted-foreground text-sm">
              The tournament state appears to be corrupted or missing.
            </p>
            <p className="text-muted-foreground text-sm">
              Automatically resetting in a moment...
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={async () => {
              try {
                await resetTournament();
              } catch (error) {
                console.error('Manual reset failed:', error);
              }
            }}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Now
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Tournament Bracket</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="destructive" onClick={handleResetTournament}>
            <RotateCcw className="h-4 w-4 mr-2" />
            End
          </Button>
        </div>
      </div>

      {/* Winner Selection Interface */}
      {tournamentData?.matches && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Select Match Winners</h3>
              <span className="text-sm text-muted-foreground">
                Click on a player's name to select them as the winner
              </span>
            </div>
            <div className="space-y-6">
              {/* Group matches by round */}
              {(() => {
                // Group matches by round_id
                const matchesByRound = tournamentData.matches.reduce((acc: any, match: any) => {
                  const roundId = match.round_id;
                  if (!acc[roundId]) {
                    acc[roundId] = [];
                  }
                  acc[roundId].push(match);
                  return acc;
                }, {});

                // Convert to array and sort by round_id
                const sortedRounds = Object.entries(matchesByRound)
                  .sort(([a], [b]) => parseInt(a) - parseInt(b))
                  .map(([roundId, matches]: [string, any]) => ({
                    roundId: parseInt(roundId),
                    matches: matches.sort((a: any, b: any) => a.number - b.number)
                  }));

                return sortedRounds.map(({ roundId, matches }) => {
                  // Get round name based on tournament structure
                  const getRoundName = (round: number, totalRounds: number) => {
                    if (totalRounds === 1) return 'Final';
                    if (round === totalRounds) return 'Final';
                    if (round === totalRounds - 1) return 'Semifinals';
                    if (round === totalRounds - 2) return 'Quarterfinals';
                    return `Round ${round}`;
                  };

                  const totalRounds = sortedRounds.length;
                  const roundName = getRoundName(roundId, totalRounds);

                  return (
                    <div key={roundId} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-1 bg-primary rounded-full"></div>
                        <h4 className="text-lg font-semibold text-primary">{roundName}</h4>
                        <span className="text-sm text-muted-foreground">
                          ({matches.length} match{matches.length !== 1 ? 'es' : ''})
                        </span>
                      </div>
                      
                      <div className="space-y-2 ml-3">
                        {matches.map((match: any) => {
                          // Convert numeric status to string
                          const getMatchStatus = (status: number) => {
                            switch (status) {
                              case 0: return 'waiting';
                              case 1: return 'locked';
                              case 2: return 'ready';
                              case 3: return 'running';
                              case 4: return 'completed';
                              default: return 'unknown';
                            }
                          };

                          // Get participant names by ID
                          const getParticipantName = (participantId: number | null) => {
                            if (!participantId) return 'TBD';
                            const participant = tournamentData.participants.find((p: any) => p.id === participantId);
                            return participant?.name || `Player ${participantId}`;
                          };

                          const status = getMatchStatus(match.status);
                          const player1Name = getParticipantName(match.opponent1?.id);
                          const player2Name = getParticipantName(match.opponent2?.id);

                          return (
                            <div
                              key={match.id}
                              className={`p-3 border rounded-md transition-colors ${
                                status === 'ready' 
                                  ? 'bg-green-50 border-green-200' 
                                  : status === 'completed'
                                  ? 'bg-blue-50 border-blue-200'
                                  : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <span className="text-sm font-medium">Match {match.number || match.id}</span>
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    status === 'ready' 
                                      ? 'bg-green-100 text-green-800 font-medium' 
                                      : status === 'completed'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-gray-200 text-gray-600'
                                  }`}>
                                    {status === 'ready' ? '⚡ Ready to Play' : status === 'completed' ? '✅ Complete' : status}
                                  </span>
                                </div>
                              </div>
                              
                              {status === 'ready' ? (
                                <div className="mt-3 flex items-center justify-between">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      console.log('Manual winner selection - Player 1:', player1Name);
                                      const fullMatch = {
                                        ...match,
                                        status,
                                        opponent1: { 
                                          ...match.opponent1,
                                          participant: { name: player1Name }
                                        },
                                        opponent2: { 
                                          ...match.opponent2,
                                          participant: { name: player2Name }
                                        }
                                      };
                                      handleSelectWinner(1, fullMatch);
                                    }}
                                    className="flex-1 mr-2 hover:bg-green-100 hover:border-green-300"
                                  >
                                    <Trophy className="h-3 w-3 mr-1" />
                                    {player1Name}
                                  </Button>
                                  <span className="text-xs text-muted-foreground mx-2 font-medium">vs</span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      console.log('Manual winner selection - Player 2:', player2Name);
                                      const fullMatch = {
                                        ...match,
                                        status,
                                        opponent1: { 
                                          ...match.opponent1,
                                          participant: { name: player1Name }
                                        },
                                        opponent2: { 
                                          ...match.opponent2,
                                          participant: { name: player2Name }
                                        }
                                      };
                                      handleSelectWinner(2, fullMatch);
                                    }}
                                    className="flex-1 ml-2 hover:bg-green-100 hover:border-green-300"
                                  >
                                    <Trophy className="h-3 w-3 mr-1" />
                                    {player2Name}
                                  </Button>
                                </div>
                              ) : status === 'completed' ? (
                                <div className="mt-3 flex items-center justify-center text-blue-700 text-sm font-medium">
                                  <span className={match.opponent1?.result === 'win' ? 'font-bold' : ''}>{player1Name}</span>
                                  <span className="mx-2">vs</span>
                                  <span className={match.opponent2?.result === 'win' ? 'font-bold' : ''}>{player2Name}</span>
                                  <span className="ml-4 text-xs">
                                    Winner: {match.opponent1?.result === 'win' ? player1Name : player2Name}
                                  </span>
                                </div>
                              ) : (
                                <div className="mt-3 flex items-center justify-center text-muted-foreground text-sm">
                                  <span>{player1Name}</span>
                                  <span className="mx-2">vs</span>
                                  <span>{player2Name}</span>
                                  <span className="ml-4 text-xs">Waiting for previous matches</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
              
              {tournamentData.matches.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No matches found
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold">Tournament Bracket View</h3>
            <span className="text-sm text-muted-foreground">
              Visual representation of the tournament progress
            </span>
          </div>
          <div 
            id="tournament-bracket"
            ref={bracketRef} 
            className="brackets-viewer"
            style={{ minHeight: '400px' }}
          />
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Winner</DialogTitle>
          </DialogHeader>
          {selectedMatch && (
            <div className="space-y-4">
              <p className="text-center text-muted-foreground">
                Who won this match?
              </p>
              <div className="grid grid-cols-1 gap-3">
                <Button
                  size="lg"
                  onClick={() => handleSelectWinner(1)}
                  className="justify-center h-12"
                >
                  <Trophy className="h-4 w-4 mr-2" />
                  {selectedMatch.opponent1?.participant?.name || 'Player 1'}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => handleSelectWinner(2)}
                  className="justify-center h-12"
                >
                  <Trophy className="h-4 w-4 mr-2" />
                  {selectedMatch.opponent2?.participant?.name || 'Player 2'}
                </Button>
              </div>
              <div className="flex justify-end">
                <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Victory Celebration Modal */}
      <Dialog open={showVictoryModal} onOpenChange={handleCloseVictoryModal}>
        <DialogContent className="sm:max-w-md w-full mx-auto">
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 z-10"
            onClick={handleCloseVictoryModal}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
          <div className="text-center">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-center gap-2 text-2xl text-yellow-600 mb-4">
                <Crown className="h-8 w-8" />
                Tournament Champion!
                <Crown className="h-8 w-8" />
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="text-6xl">🏆</div>
              <div className="space-y-2">
                <p className="text-xl font-bold text-primary">
                  Congratulations!
                </p>
                <p className="text-2xl font-bold text-yellow-600">
                  {tournamentWinner}
                </p>
                <p className="text-lg text-muted-foreground">
                  You are the tournament champion!
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button
                  onClick={handleCloseVictoryModal}
                  variant="outline"
                >
                  Continue
                </Button>
                <Button
                  onClick={handleNewTournament}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  New Tournament
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 