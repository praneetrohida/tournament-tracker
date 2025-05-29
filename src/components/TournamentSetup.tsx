import { useAtom } from 'jotai';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  playersAtom, 
  tournamentSettingsAtom, 
  createTournamentAtom, 
  tournamentCreatedAtom 
} from '@/lib/store';
import type { TournamentSettings } from '@/lib/tournamentManager';

export const TournamentSetup = () => {
  const [players] = useAtom(playersAtom);
  const [settings, setSettings] = useAtom(tournamentSettingsAtom);
  const [, createTournament] = useAtom(createTournamentAtom);
  const [tournamentCreated] = useAtom(tournamentCreatedAtom);

  const handleCreateTournament = async () => {
    try {
      await createTournament();
    } catch (error) {
      console.error('Failed to create tournament:', error);
    }
  };

  const handleSettingsChange = (key: keyof TournamentSettings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const canCreateTournament = players.length >= 2 && !tournamentCreated;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tournament Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-sm font-medium">Tournament Type</Label>
          <RadioGroup
            value={settings.type}
            onValueChange={(value) => handleSettingsChange('type', value)}
            className="grid grid-cols-1 gap-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="single_elimination" id="single" />
              <Label htmlFor="single" className="text-sm">
                Single Elimination
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="double_elimination" id="double" />
              <Label htmlFor="double" className="text-sm">
                Double Elimination
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium">Game Type</Label>
          <Select
            value={settings.gameType}
            onValueChange={(value) => handleSettingsChange('gameType', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select game type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="singles">Singles</SelectItem>
              <SelectItem value="doubles">Doubles</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="pt-4 border-t">
          <div className="space-y-2 mb-4">
            <p className="text-sm text-muted-foreground">
              <strong>Players:</strong> {players.length}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Type:</strong> {settings.type === 'single_elimination' ? 'Single Elimination' : 'Double Elimination'}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Format:</strong> {settings.gameType === 'singles' ? 'Singles' : 'Doubles'}
            </p>
          </div>

          <Button 
            onClick={handleCreateTournament}
            disabled={!canCreateTournament}
            className="w-full"
            size="lg"
          >
            {tournamentCreated ? 'Tournament Created' : 'Create Tournament'}
          </Button>

          {players.length < 2 && (
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Add at least 2 players to create a tournament
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}; 