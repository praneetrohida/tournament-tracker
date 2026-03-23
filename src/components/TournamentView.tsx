/* eslint-disable @typescript-eslint/no-explicit-any */
import { useAtom } from 'jotai';
import { useEffect } from 'react';
import {
  tournamentDataAtom,
  tournamentSettingsAtom,
  resetTournamentAtom,
  refreshTournamentDataAtom,
  startScoringAtom,
  appViewAtom,
} from '@/lib/store';

const getParticipantName = (tournamentData: any, participantId: number | null) => {
  if (!participantId) return 'TBD';
  const participant = tournamentData.participants.find((p: any) => p.id === participantId);
  return participant?.name || `Player ${participantId}`;
};

const getAvatarUrl = (name: string) =>
  `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(name)}`;

export const TournamentView = () => {
  const [tournamentData] = useAtom(tournamentDataAtom);
  const [settings] = useAtom(tournamentSettingsAtom);
  const [, resetTournament] = useAtom(resetTournamentAtom);
  const [, refreshTournamentData] = useAtom(refreshTournamentDataAtom);
  const [, startScoring] = useAtom(startScoringAtom);
  const [, setAppView] = useAtom(appViewAtom);

  // Refresh data on mount
  useEffect(() => {
    refreshTournamentData();
  }, [refreshTournamentData]);

  // Victory detection — check if any real matches remain to be played
  useEffect(() => {
    if (!tournamentData?.matches) return;

    const allMatches = tournamentData.matches;

    // A match is "real" if both opponents are non-null (not a BYE)
    const realMatches = allMatches.filter(
      (m: any) => m.opponent1 !== null && m.opponent2 !== null
    );

    // At least one real match must be completed for a tournament to be over
    // Status 4 = completed, status 5 = archived (also completed)
    const hasCompletedReal = realMatches.some((m: any) => m.status >= 4);
    if (!hasCompletedReal) return;

    // Check if there are any matches still playable
    const hasPlayableMatches = allMatches.some(
      (m: any) =>
        m.status === 2 || // ready
        (m.status === 0 && m.opponent1?.id && m.opponent2?.id) // waiting but both present
    );

    if (!hasPlayableMatches) {
      setAppView('podium');
    }
  }, [tournamentData, setAppView]);

  // Empty / loading state
  if (!tournamentData || !tournamentData.matches || tournamentData.matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-6">
        <span className="material-symbols-outlined text-5xl text-on-surface-variant">
          emoji_events
        </span>
        <p className="text-on-surface-variant font-medium">No tournament data available.</p>
        <button
          onClick={() => resetTournament()}
          className="px-6 py-3 bg-error-container text-on-error-container rounded-lg font-bold text-xs uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all"
        >
          Reset
        </button>
      </div>
    );
  }

  const participants = tournamentData.participants || [];
  const matches: any[] = tournamentData.matches || [];

  const getName = (id: number | null) => getParticipantName(tournamentData, id);

  // Filter out BYE matches (opponent is literally null)
  const visibleMatches = matches.filter(
    (m: any) => m.opponent1 !== null && m.opponent2 !== null
  );

  const readyMatches = visibleMatches.filter((m: any) => m.status === 2);
  const waitingMatches = visibleMatches.filter((m: any) => m.status === 0 || m.status === 1);
  const completedMatches = visibleMatches.filter((m: any) => m.status >= 4);
  const upcomingMatches = [...readyMatches, ...waitingMatches];

  const renderPlayerAvatar = (
    name: string,
    extraClasses: string = '',
    isWinner: boolean = false,
    isLoser: boolean = false
  ) => {
    const borderClass = isWinner
      ? 'border-2 border-primary'
      : isLoser
      ? 'grayscale'
      : '';
    const names = name.includes(' & ') ? name.split(' & ') : null;

    if (names) {
      return (
        <div className={`relative w-12 h-12 shrink-0 ${isLoser ? 'grayscale' : ''} ${extraClasses}`}>
          <div className={`absolute top-0 left-0 w-8 h-8 rounded-full bg-surface-container-highest overflow-hidden ring-2 ring-surface z-10 ${isWinner ? 'ring-primary' : ''}`}>
            <img src={getAvatarUrl(names[0])} alt={names[0]} className="w-full h-full" />
          </div>
          <div className={`absolute bottom-0 right-0 w-8 h-8 rounded-full bg-surface-container-highest overflow-hidden ring-2 ring-surface ${isWinner ? 'ring-primary' : ''}`}>
            <img src={getAvatarUrl(names[1])} alt={names[1]} className="w-full h-full" />
          </div>
        </div>
      );
    }

    return (
      <div
        className={`w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center overflow-hidden ${borderClass} ${extraClasses}`}
      >
        {name === 'TBD' ? (
          <span className="text-sm font-bold text-on-surface">?</span>
        ) : (
          <img src={getAvatarUrl(name)} alt={name} className="w-full h-full" />
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="mb-12 relative">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary/20 blur-[80px] rounded-full" />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-secondary/10 blur-[80px] rounded-full" />
        <span className="inline-block px-4 py-1 rounded-full bg-surface-container-highest text-secondary text-[10px] font-bold uppercase tracking-widest mb-4">
          {settings.type === 'single_elimination'
            ? 'Single Elimination'
            : 'Double Elimination'}
        </span>
        <h2 className="text-5xl font-extrabold tracking-tighter leading-none mb-4 italic">
          TOURNAMENT <br />
          <span className="text-primary">BRACKET</span>
        </h2>
        <p className="text-on-surface-variant font-medium opacity-80 max-w-[80%]">
          {participants.length} Players.{' '}
          {settings.type === 'single_elimination' ? 'Single' : 'Double'} Elimination.
          One Champion.
        </p>
      </section>

      {/* Upcoming Matches */}
      {upcomingMatches.length > 0 && (
        <section className="mb-8">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">calendar_month</span>
            UPCOMING MATCHES
          </h3>
          <div className="mt-4 space-y-3">
            {upcomingMatches.map((match: any) => {
              const p1Name = getName(match.opponent1?.id);
              const p2Name = getName(match.opponent2?.id);
              const isReady = match.status === 2;

              return (
                <div
                  key={match.id}
                  className="bg-surface-container-low rounded-xl p-5 hover:bg-surface-container transition-all group border border-white/5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {renderPlayerAvatar(p1Name)}
                      <p className="text-sm font-bold">{p1Name}</p>
                    </div>
                    <div className="px-4">
                      <span className="text-xs font-black italic text-primary/40">VS</span>
                    </div>
                    <div className="flex items-center gap-3 flex-1 justify-end">
                      <p className="text-sm font-bold text-right">{p2Name}</p>
                      {renderPlayerAvatar(p2Name)}
                    </div>
                  </div>
                  {isReady && (
                    <button
                      onClick={() => startScoring(match)}
                      className="w-full mt-4 bg-tertiary-container text-on-tertiary-container py-3 rounded-lg font-extrabold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">play_arrow</span>
                      Play Now
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Completed Matches */}
      {completedMatches.length > 0 && (
        <section className="mb-8">
          <h3 className="text-lg font-bold flex items-center gap-2 pt-6">
            <span className="material-symbols-outlined text-on-surface-variant">task_alt</span>
            COMPLETED
          </h3>
          <div className="mt-4 space-y-3">
            {completedMatches.map((match: any) => {
              const p1Name = getName(match.opponent1?.id);
              const p2Name = getName(match.opponent2?.id);
              const p1Won = match.opponent1?.result === 'win';
              const p2Won = match.opponent2?.result === 'win';
              const score1 = match.opponent1?.score ?? 0;
              const score2 = match.opponent2?.score ?? 0;

              return (
                <div
                  key={match.id}
                  className="bg-surface-container-lowest border border-white/5 rounded-xl p-5 opacity-60 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {renderPlayerAvatar(p1Name, '', p1Won, !p1Won)}
                      <div>
                        <p className={p1Won ? 'text-sm font-bold text-primary' : 'text-sm font-bold line-through text-on-surface-variant'}>
                          {p1Name}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-on-surface-variant">
                          {p1Won ? 'WINNER' : 'Eliminated'}
                        </p>
                      </div>
                    </div>
                    <div className="px-4">
                      <span className="text-[10px] font-bold text-on-surface-variant">
                        {score1} - {score2}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-1 justify-end">
                      <div className="text-right">
                        <p className={p2Won ? 'text-sm font-bold text-primary' : 'text-sm font-bold line-through text-on-surface-variant'}>
                          {p2Name}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-on-surface-variant">
                          {p2Won ? 'WINNER' : 'Eliminated'}
                        </p>
                      </div>
                      {renderPlayerAvatar(p2Name, '', p2Won, !p2Won)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
