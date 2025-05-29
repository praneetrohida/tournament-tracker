import { useAtom } from 'jotai';
import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { playersAtom } from '@/lib/store';
import type { TournamentPlayer } from '@/lib/tournamentManager';

export const PlayerSetup = () => {
  const [players, setPlayers] = useAtom(playersAtom);
  const [newPlayerName, setNewPlayerName] = useState('');

  const handleAddPlayer = () => {
    if (newPlayerName.trim()) {
      const newPlayer: TournamentPlayer = {
        id: Date.now().toString(),
        name: newPlayerName.trim(),
      };
      setPlayers([...players, newPlayer]);
      setNewPlayerName('');
    }
  };

  const handleRemovePlayer = (playerId: string) => {
    setPlayers(players.filter(player => player.id !== playerId));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddPlayer();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Players</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter player name"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button 
            onClick={handleAddPlayer}
            disabled={!newPlayerName.trim()}
            size="sm"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {players.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">
              Players ({players.length})
            </h4>
            <div className="space-y-1">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-2 bg-muted rounded-md"
                >
                  <span className="text-sm">{player.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemovePlayer(player.id)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {players.length < 2 && (
          <p className="text-sm text-muted-foreground">
            Add at least 2 players to start a tournament
          </p>
        )}
      </CardContent>
    </Card>
  );
}; 