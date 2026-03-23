/* eslint-disable @typescript-eslint/no-explicit-any */
import { useAtom } from 'jotai';
import {
  activeMatchAtom,
  matchScoresAtom,
  updateMatchAtom,
  tournamentDataAtom,
  appViewAtom,
} from '@/lib/store';

const getParticipantName = (tournamentData: any, participantId: number | null) => {
  if (!participantId || !tournamentData?.participants) return 'TBD';
  const participant = tournamentData.participants.find((p: any) => p.id === participantId);
  return participant?.name || `Player ${participantId}`;
};

export const MatchScoreEntry = () => {
  const [activeMatch] = useAtom(activeMatchAtom);
  const [scores, setScores] = useAtom(matchScoresAtom);
  const [, updateMatch] = useAtom(updateMatchAtom);
  const [tournamentData] = useAtom(tournamentDataAtom);
  const [, setAppView] = useAtom(appViewAtom);

  if (!activeMatch) return null;

  const player1Name = getParticipantName(tournamentData, activeMatch.opponent1?.id);
  const player2Name = getParticipantName(tournamentData, activeMatch.opponent2?.id);

  const handleSelectWinner = (winner: 'player1' | 'player2') => {
    setScores({ ...scores, selectedWinner: winner });
  };

  const updateWinnerFromScores = (p1: number, p2: number): 'player1' | 'player2' | null => {
    if (p1 > p2) return 'player1';
    if (p2 > p1) return 'player2';
    return null;
  };

  const handleIncrement = (player: 'player1' | 'player2') => {
    const p1 = player === 'player1' ? scores.player1Score + 1 : scores.player1Score;
    const p2 = player === 'player2' ? scores.player2Score + 1 : scores.player2Score;
    setScores({ ...scores, player1Score: p1, player2Score: p2, selectedWinner: updateWinnerFromScores(p1, p2) });
  };

  const handleDecrement = (player: 'player1' | 'player2') => {
    const p1 = player === 'player1' ? Math.max(0, scores.player1Score - 1) : scores.player1Score;
    const p2 = player === 'player2' ? Math.max(0, scores.player2Score - 1) : scores.player2Score;
    setScores({ ...scores, player1Score: p1, player2Score: p2, selectedWinner: updateWinnerFromScores(p1, p2) });
  };

  const handleCancel = () => {
    setAppView('bracket');
  };

  const handleConfirm = async () => {
    if (!scores.selectedWinner) return;

    let opponent1Score = scores.player1Score;
    let opponent2Score = scores.player2Score;

    // Ensure the selected winner has the higher score
    if (scores.selectedWinner === 'player1') {
      if (opponent1Score <= opponent2Score) {
        opponent1Score = opponent1Score === 0 && opponent2Score === 0 ? 1 : Math.max(opponent1Score, opponent2Score) + 1;
      }
    } else {
      if (opponent2Score <= opponent1Score) {
        opponent2Score = opponent1Score === 0 && opponent2Score === 0 ? 1 : Math.max(opponent1Score, opponent2Score) + 1;
      }
    }

    await updateMatch({
      matchId: activeMatch.id,
      opponent1Score,
      opponent2Score,
    });
  };

  return (
    <div className="relative min-h-screen pb-32">
      {/* Background decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 -right-20 w-60 h-60 bg-primary/15 blur-[100px] rounded-full" />
        <div className="absolute bottom-40 -left-20 w-60 h-60 bg-secondary/10 blur-[100px] rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-tertiary/5 blur-[80px] rounded-full" />
      </div>

      <div className="relative z-10 space-y-6">
        {/* Back button */}
        <button
          onClick={handleCancel}
          className="flex items-center gap-1 text-on-surface-variant text-sm font-medium hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Back
        </button>

        {/* 1. Editorial Header */}
        <header className="relative">
          <h2 className="text-[2.5rem] leading-none font-extrabold tracking-tighter text-white/5 absolute -top-4 -left-2 select-none uppercase">MATCH</h2>
          <div className="relative z-10">
            <p className="font-bold text-tertiary text-[10px] uppercase tracking-widest mb-0.5">Live Score Entry</p>
            <h1 className="text-2xl font-extrabold text-on-background">Declare the <span className="text-primary italic">Victor.</span></h1>
          </div>
        </header>

        {/* 2. Player Selection */}
        <div className="space-y-0">
          {/* Player 1 */}
          <button
            onClick={() => handleSelectWinner('player1')}
            className={
              scores.selectedWinner === 'player1'
                ? 'w-full relative flex items-center justify-between p-4 rounded-xl bg-surface-container-high border-2 border-secondary shadow-[0_0_20px_rgba(0,207,252,0.15)] transition-all active:scale-[0.98]'
                : 'w-full relative flex items-center justify-between p-4 rounded-xl bg-surface-container-low border border-white/5 opacity-60 transition-all active:scale-[0.98]'
            }
          >
            <div className="flex flex-col items-start text-left">
              <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${scores.selectedWinner === 'player1' ? 'text-secondary' : 'text-white/40'}`}>TEAM ALPHA</p>
              <h3 className={`text-lg font-extrabold leading-none ${scores.selectedWinner === 'player1' ? 'text-white' : 'text-white/70'}`}>{player1Name}</h3>
            </div>
            {scores.selectedWinner === 'player1' ? (
              <div className="bg-secondary text-on-secondary rounded-full h-8 w-8 flex items-center justify-center">
                <span className="material-symbols-filled text-base">check_circle</span>
              </div>
            ) : (
              <div className="h-8 w-8 rounded-full border border-white/10 flex items-center justify-center text-white/20">
                <span className="material-symbols-outlined text-base">circle</span>
              </div>
            )}
          </button>

          {/* VS Divider */}
          <div className="flex items-center justify-center gap-4 py-1">
            <div className="h-[1px] flex-grow bg-white/5" />
            <div className="italic font-black text-xs text-primary/40 tracking-tighter uppercase">Versus</div>
            <div className="h-[1px] flex-grow bg-white/5" />
          </div>

          {/* Player 2 */}
          <button
            onClick={() => handleSelectWinner('player2')}
            className={
              scores.selectedWinner === 'player2'
                ? 'w-full relative flex items-center justify-between p-4 rounded-xl bg-surface-container-high border-2 border-secondary shadow-[0_0_20px_rgba(0,207,252,0.15)] transition-all active:scale-[0.98]'
                : 'w-full relative flex items-center justify-between p-4 rounded-xl bg-surface-container-low border border-white/5 opacity-60 transition-all active:scale-[0.98]'
            }
          >
            <div className="flex flex-col items-start text-left">
              <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${scores.selectedWinner === 'player2' ? 'text-secondary' : 'text-white/40'}`}>TEAM OMEGA</p>
              <h3 className={`text-lg font-extrabold leading-none ${scores.selectedWinner === 'player2' ? 'text-white' : 'text-white/70'}`}>{player2Name}</h3>
            </div>
            {scores.selectedWinner === 'player2' ? (
              <div className="bg-secondary text-on-secondary rounded-full h-8 w-8 flex items-center justify-center">
                <span className="material-symbols-filled text-base">check_circle</span>
              </div>
            ) : (
              <div className="h-8 w-8 rounded-full border border-white/10 flex items-center justify-center text-white/20">
                <span className="material-symbols-outlined text-base">circle</span>
              </div>
            )}
          </button>
        </div>

        {/* 3. Score Input Card */}
        <section className="bg-surface-container-low/50 rounded-xl p-5 border border-white/5 relative overflow-hidden">
          <h4 className="text-white/60 font-bold uppercase tracking-widest text-[10px] mb-4 text-center">Final Set Score</h4>
          <div className="flex items-center justify-center gap-8">
            {/* Score One */}
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={() => handleIncrement('player1')}
                className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary active:bg-primary active:text-on-primary transition-all"
              >
                <span className="material-symbols-outlined text-xl">add</span>
              </button>
              <span className="text-4xl font-black text-white tabular-nums tracking-tighter">{scores.player1Score}</span>
              <button
                onClick={() => handleDecrement('player1')}
                className="h-10 w-10 rounded-full border border-white/10 flex items-center justify-center text-white/30 active:bg-surface-variant transition-all"
              >
                <span className="material-symbols-outlined text-xl">remove</span>
              </button>
            </div>

            {/* Divider */}
            <div className="h-16 w-[1px] bg-white/10 self-center" />

            {/* Score Two */}
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={() => handleIncrement('player2')}
                className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary active:bg-primary active:text-on-primary transition-all"
              >
                <span className="material-symbols-outlined text-xl">add</span>
              </button>
              <span className="text-4xl font-black text-white tabular-nums tracking-tighter">{scores.player2Score}</span>
              <button
                onClick={() => handleDecrement('player2')}
                className="h-10 w-10 rounded-full border border-white/10 flex items-center justify-center text-white/30 active:bg-surface-variant transition-all"
              >
                <span className="material-symbols-outlined text-xl">remove</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* 4. Fixed Bottom Action Bar */}
      <div className="fixed bottom-10 left-0 w-full px-6 z-40 pointer-events-none">
        <button
          disabled={!scores.selectedWinner}
          onClick={handleConfirm}
          className="pointer-events-auto w-full kinetic-gradient text-on-primary py-6 rounded-full font-extrabold text-lg uppercase tracking-widest kinetic-shadow-strong flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Confirm Result
          <span className="material-symbols-outlined font-bold text-lg">arrow_forward</span>
        </button>
      </div>
    </div>
  );
};
