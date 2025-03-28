import { useAtom } from 'jotai';
import { Trophy as BadmintonIcon } from 'lucide-react';
import { isSetupCompleteAtom } from './lib/store';
import { PlayerSetup } from './components/PlayerSetup';
import { TournamentSetup } from './components/TournamentSetup';
import { TournamentView } from './components/TournamentView';

function App() {
  console.log('rendering app');
  const [isSetupComplete] = useAtom(isSetupCompleteAtom);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-2">
          <BadmintonIcon className="h-6 w-6" />
          <h1 className="text-xl font-bold">Badminton Tournament Tracker</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!isSetupComplete ? (
          <div className="max-w-2xl mx-auto space-y-8">
            <PlayerSetup />
            <TournamentSetup />
          </div>
        ) : (
          <TournamentView />
        )}
      </main>
    </div>
  );
}

export default App;