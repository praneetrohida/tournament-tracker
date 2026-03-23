import { useEffect, useMemo } from 'react';
import { useAtom } from 'jotai';
import confetti from 'canvas-confetti';
import {
  tournamentDataAtom,
  resetTournamentAtom,
  appViewAtom,
  tournamentSettingsAtom,
} from '@/lib/store';

const getAvatarUrl = (name: string) =>
  `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(name)}`;

export function PodiumView() {
  const [tournamentData] = useAtom(tournamentDataAtom);
  const [, resetTournament] = useAtom(resetTournamentAtom);
  const [, setAppView] = useAtom(appViewAtom);
  const [settings] = useAtom(tournamentSettingsAtom);

  const { winner, secondPlace, thirdPlace, winCounts } = useMemo(() => {
    if (!tournamentData) {
      return { winner: null, secondPlace: null, thirdPlace: null, winCounts: new Map<number, number>() };
    }

    const { matches, participants } = tournamentData;
    const isDouble = settings.type === 'double_elimination';

    // Build a win count map: participant id -> number of match wins
    const counts = new Map<number, number>();
    for (const match of matches) {
      if (match.status < 4) continue;
      if (match.opponent1?.result === 'win' && match.opponent1?.id != null) {
        counts.set(match.opponent1.id, (counts.get(match.opponent1.id) || 0) + 1);
      }
      if (match.opponent2?.result === 'win' && match.opponent2?.id != null) {
        counts.set(match.opponent2.id, (counts.get(match.opponent2.id) || 0) + 1);
      }
    }

    const getName = (id: number | null | undefined): string | null => {
      if (id == null) return null;
      const p = participants.find((p: { id: number; name: string }) => p.id === id);
      return p?.name ?? null;
    };

    let finalMatch: typeof matches[number] | null = null;
    let semiFinalMatches: typeof matches[number][] = [];

    if (isDouble) {
      // Grand final matches have group_id === 3
      const grandFinalMatches = matches
        .filter((m: { group_id: number; status: number }) => m.group_id === 3 && m.status >= 4)
        .sort((a: { round_id: number }, b: { round_id: number }) => b.round_id - a.round_id);
      finalMatch = grandFinalMatches[0] ?? null;

      // 3rd place: loser of losers bracket final (highest round in group_id 2)
      const losersBracketMatches = matches
        .filter((m: { group_id: number; status: number }) => m.group_id === 2 && m.status >= 4)
        .sort((a: { round_id: number }, b: { round_id: number }) => b.round_id - a.round_id);
      semiFinalMatches = losersBracketMatches.length > 0 ? [losersBracketMatches[0]] : [];
    } else {
      // Single elimination: find match with highest round_id that is completed
      const completedMatches = matches
        .filter((m: { status: number }) => m.status >= 4)
        .sort((a: { round_id: number }, b: { round_id: number }) => b.round_id - a.round_id);
      finalMatch = completedMatches[0] ?? null;

      // Semifinal matches: one round before the final
      if (finalMatch) {
        semiFinalMatches = matches.filter(
          (m: { round_id: number; status: number }) =>
            m.round_id === finalMatch!.round_id - 1 && m.status >= 4
        );
      }
    }

    let winnerId: number | null = null;
    let secondId: number | null = null;
    let thirdId: number | null = null;

    if (finalMatch) {
      if (finalMatch.opponent1?.result === 'win') {
        winnerId = finalMatch.opponent1.id;
        secondId = finalMatch.opponent2?.id ?? null;
      } else if (finalMatch.opponent2?.result === 'win') {
        winnerId = finalMatch.opponent2.id;
        secondId = finalMatch.opponent1?.id ?? null;
      }
    }

    // Determine 3rd place
    if (isDouble && semiFinalMatches.length > 0) {
      // Loser of losers bracket final
      const lbFinal = semiFinalMatches[0];
      if (lbFinal.opponent1?.result === 'loss') {
        thirdId = lbFinal.opponent1.id;
      } else if (lbFinal.opponent2?.result === 'loss') {
        thirdId = lbFinal.opponent2.id;
      }
    } else if (!isDouble && semiFinalMatches.length > 0) {
      // Losers of the semifinal — pick the one with more wins, or the first
      const semiLosers = semiFinalMatches
        .map((m) => {
          if (m.opponent1?.result === 'loss') return m.opponent1.id;
          if (m.opponent2?.result === 'loss') return m.opponent2.id;
          return null;
        })
        .filter((id): id is number => id != null);
      if (semiLosers.length > 0) {
        // Pick the semifinal loser with the most wins
        semiLosers.sort((a, b) => (counts.get(b) || 0) - (counts.get(a) || 0));
        thirdId = semiLosers[0];
      }
    }

    return {
      winner: getName(winnerId) ? { name: getName(winnerId)!, id: winnerId! } : null,
      secondPlace: getName(secondId) ? { name: getName(secondId)!, id: secondId! } : null,
      thirdPlace: getName(thirdId) ? { name: getName(thirdId)!, id: thirdId! } : null,
      winCounts: counts,
    };
  }, [tournamentData, settings.type]);

  // Confetti on mount
  useEffect(() => {
    const duration = 3000;
    const end = Date.now() + duration;
    const colors = ['#bd9dff', '#00cffc', '#fed01b', '#ff6e84'];

    let animationFrame: number;
    const frame = () => {
      confetti({ particleCount: 2, angle: 60, spread: 55, origin: { x: 0 }, colors });
      confetti({ particleCount: 2, angle: 120, spread: 55, origin: { x: 1 }, colors });
      if (Date.now() < end) {
        animationFrame = requestAnimationFrame(frame);
      }
    };
    animationFrame = requestAnimationFrame(frame);

    return () => cancelAnimationFrame(animationFrame);
  }, []);

  const handleNewTournament = () => {
    resetTournament();
  };

  if (!winner) {
    return (
      <div className="text-center py-20 text-white/50">
        <p>No winner determined yet.</p>
        <button
          onClick={() => setAppView('bracket')}
          className="mt-4 text-primary underline"
        >
          Back to Bracket
        </button>
      </div>
    );
  }

  const winnerWins = winCounts.get(winner.id) || 0;

  return (
    <div>
      {/* Hero Winner Section */}
      <section className="relative mb-12">
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-primary/20 blur-[100px] rounded-full" />
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-secondary/10 blur-[100px] rounded-full" />
        <div className="relative z-10 text-center">
          <div className="inline-flex items-center justify-center p-4 bg-surface-container rounded-full mb-6 border border-white/5 shadow-xl">
            <span className="material-symbols-filled text-tertiary-fixed text-5xl">emoji_events</span>
          </div>
          <p className="text-secondary font-label text-[0.6875rem] font-bold uppercase tracking-widest mb-2">
            Grand Announcement
          </p>
          <h1 className="text-[3.5rem] leading-none font-extrabold tracking-tighter mb-4 italic">
            The Champion: <br />
            <span className="text-transparent bg-clip-text kinetic-gradient">{winner.name}</span>
          </h1>
          <div className="flex justify-center mt-8">
            {winner.name.includes(' & ') ? (
              <div className="relative w-16 h-16">
                <div className="absolute top-0 left-0 w-11 h-11 rounded-full bg-surface-container-highest overflow-hidden ring-4 ring-surface z-10">
                  <img src={getAvatarUrl(winner.name.split(' & ')[0])} alt={winner.name.split(' & ')[0]} className="w-full h-full" />
                </div>
                <div className="absolute bottom-0 right-0 w-11 h-11 rounded-full bg-surface-container-highest overflow-hidden ring-4 ring-surface">
                  <img src={getAvatarUrl(winner.name.split(' & ')[1])} alt={winner.name.split(' & ')[1]} className="w-full h-full" />
                </div>
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full border-4 border-surface bg-surface-container-highest overflow-hidden">
                <img src={getAvatarUrl(winner.name)} alt={winner.name} className="w-full h-full" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Stats Card */}
      <section className="mb-8">
        <div className="glass-card p-6 rounded-xl border border-white/5 flex items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-3xl">emoji_events</span>
          </div>
          <div>
            <p className="text-white/50 text-[10px] uppercase font-bold tracking-widest mb-1">
              Tournament Performance
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white tracking-tighter">{winnerWins}</span>
              <span className="text-secondary text-sm font-bold uppercase tracking-wider">Total Wins</span>
            </div>
          </div>
        </div>
      </section>

      {/* Podium Standings */}
      {secondPlace && (
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold tracking-tight">Podium Standings</h2>
            <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Elite Tier</span>
          </div>
          <div className="space-y-3">
            {/* 2nd place */}
            <div className="flex items-center justify-between p-4 bg-surface-container rounded-full group hover:bg-surface-bright transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 text-white/40 font-bold text-sm">
                  2
                </div>
                <div>
                  <p className="font-bold text-sm">{secondPlace.name}</p>
                  <p className="text-[10px] text-white/40 uppercase">
                    {winCounts.get(secondPlace.id) || 0} Wins
                  </p>
                </div>
              </div>
              <div className="text-right pr-2">
                <span className="text-xs font-bold text-primary">Runner Up</span>
              </div>
            </div>

            {/* 3rd place if available */}
            {thirdPlace && (
              <div className="flex items-center justify-between p-4 bg-surface-container rounded-full group hover:bg-surface-bright transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 text-white/40 font-bold text-sm">
                    3
                  </div>
                  <div>
                    <p className="font-bold text-sm">{thirdPlace.name}</p>
                    <p className="text-[10px] text-white/40 uppercase">
                      {winCounts.get(thirdPlace.id) || 0} Wins
                    </p>
                  </div>
                </div>
                <div className="text-right pr-2">
                  <span className="text-xs font-bold text-white/30">Third Place</span>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Action Buttons */}
      <section className="mt-8 space-y-4">
        <button
          onClick={handleNewTournament}
          className="w-full kinetic-gradient py-5 rounded-full text-on-primary font-bold text-sm uppercase tracking-widest shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-xl">refresh</span>
          Start New Tournament
        </button>
      </section>
    </div>
  );
}
