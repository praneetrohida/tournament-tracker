import { useAtom } from 'jotai';
import { appViewAtom, resetTournamentAtom } from './lib/store';
import { SetupScreen } from './components/SetupScreen';
import { TournamentView } from './components/TournamentView';
import { MatchScoreEntry } from './components/MatchScoreEntry';
import { PodiumView } from './components/PodiumView';

function App() {
  const [appView] = useAtom(appViewAtom);
  const [, resetTournament] = useAtom(resetTournamentAtom);

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body">
      {/* Glassmorphic Fixed Header */}
      <header className="fixed top-0 w-full z-50 bg-[#180429]/60 backdrop-blur-xl shadow-[0_20px_50px_rgba(189,157,255,0.08)]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="h-16 max-w-5xl mx-auto flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#bd9dff]">sports_tennis</span>
            <span className="font-extrabold italic tracking-tighter text-[#bd9dff] uppercase text-xl">
              Lets Play
            </span>
          </div>
          <div>
            {(appView === 'bracket' || appView === 'scoring') && (
              <button
                onClick={() => resetTournament()}
                className="bg-surface-container-high text-error font-extrabold tracking-tighter text-xs uppercase px-4 py-2 rounded-full"
              >
                Abort Tournament
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-28 pb-12 px-6 max-w-2xl mx-auto">
        {appView === 'setup' && <SetupScreen />}
        {appView === 'bracket' && <TournamentView />}
        {appView === 'scoring' && <MatchScoreEntry />}
        {appView === 'podium' && <PodiumView />}
      </main>

      {/* Background Decorations */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-[10%] -right-20 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[20%] -left-20 w-[300px] h-[300px] bg-secondary/5 rounded-full blur-[80px]" />
      </div>
    </div>
  );
}

export default App;
