import { useAtom } from 'jotai';
import { Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  gameTypeAtom,
  tournamentTypeAtom,
  playersAtom,
  teamsAtom,
  matchesAtom,
  isSetupCompleteAtom,
  GameType,
  TournamentType,
} from '@/lib/store';
import type { Team, Match } from '@/lib/store';
// Import tournament logic functions
import { generateTeams, generateMatches } from '@/lib/tournament';

export function TournamentSetup() {
  const [players] = useAtom(playersAtom);
  const [gameType, setGameType] = useAtom(gameTypeAtom);
  const [tournamentType, setTournamentType] = useAtom(tournamentTypeAtom);
  const [, setTeams] = useAtom(teamsAtom);
  const [, setMatches] = useAtom(matchesAtom);

  const handleGenerateTeams = (randomize = false) => {
    // Use the extracted logic function to generate teams
    const teams = generateTeams(players, gameType, randomize);
    setTeams(teams);
    
    // Use the extracted logic function to generate matches
    const matches = generateMatches(teams, tournamentType);
    setMatches(matches);
  };

  const canGenerateTeams = players.length >= (gameType === 'singles' ? 2 : 4);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tournament Setup</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Game Type</label>
            <Select value={gameType} onValueChange={(value: GameType) => setGameType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="singles">Singles</SelectItem>
                <SelectItem value="doubles">Doubles</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tournament Type</label>
            <Select value={tournamentType} onValueChange={(value: TournamentType) => setTournamentType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="knockout">Knockout</SelectItem>
                <SelectItem disabled value="double-elimination">Double Elimination (coming soon)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => handleGenerateTeams(false)}
            disabled={!canGenerateTeams}
            className="flex-1"
          >
            Start Tournament
          </Button>
          {gameType === 'doubles' && (
            <Button
              onClick={() => handleGenerateTeams(true)}
              disabled={!canGenerateTeams}
              variant="secondary"
              className="flex-1"
            >
              <Shuffle className="h-4 w-4 mr-2" />
              Random Teams
            </Button>
          )}
        </div>

        {!canGenerateTeams && (
          <p className="text-sm text-muted-foreground">
            Add {gameType === 'singles' ? '2' : '4'} or more players to generate teams
          </p>
        )}
      </CardContent>
    </Card>
  );
}