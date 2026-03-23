import { useState, useRef } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import {
  playersAtom,
  excludedPlayerIdsAtom,
  playerStatsAtom,
  tournamentSettingsAtom,
  createTournamentAtom,
  tournamentCreatedAtom,
  type PlayerStats,
} from '@/lib/store';
import type { TournamentPlayer } from '@/lib/tournamentManager';

function SwipeablePlayerRow({
  player,
  excluded,
  stats,
  onToggleExclude,
  onRemove,
}: {
  player: TournamentPlayer;
  excluded: boolean;
  stats?: PlayerStats;
  onToggleExclude: () => void;
  onRemove: () => void;
}) {
  const [offsetX, setOffsetX] = useState(0);
  const startX = useRef(0);
  const swiping = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    swiping.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping.current) return;
    const diff = e.touches[0].clientX - startX.current;
    // Only allow swiping left
    setOffsetX(Math.min(0, diff));
  };

  const handleTouchEnd = () => {
    swiping.current = false;
    if (offsetX < -80) {
      // Snap to reveal delete
      setOffsetX(-80);
    } else {
      setOffsetX(0);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-full">
      {/* Delete button behind */}
      <button
        onClick={onRemove}
        className="absolute right-0 top-0 bottom-0 w-20 bg-error flex items-center justify-center rounded-r-full"
      >
        <span className="material-symbols-outlined text-on-error">delete</span>
      </button>

      {/* Foreground row */}
      <div
        className="relative bg-surface-container p-5 rounded-full flex items-center gap-4 pl-5 pr-6 transition-transform"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: swiping.current ? 'none' : 'transform 0.2s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Checkbox */}
        <button
          onClick={onToggleExclude}
          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
            excluded
              ? 'border-white/20 bg-transparent'
              : 'border-secondary bg-secondary'
          }`}
        >
          {!excluded && (
            <span className="material-symbols-outlined text-on-secondary text-base">check</span>
          )}
        </button>

        <div className={`w-10 h-10 rounded-full bg-surface-container-highest overflow-hidden shrink-0 transition-opacity ${excluded ? 'opacity-30' : ''}`}>
          <img
            src={`https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(player.name)}`}
            alt={player.name}
            className="w-full h-full"
          />
        </div>
        <div className={`flex-1 transition-opacity ${excluded ? 'opacity-30' : ''}`}>
          <div className={`font-bold text-lg leading-none ${excluded ? 'line-through' : ''}`}>
            {player.name}
          </div>
          {stats && (stats.wins > 0 || stats.totalPoints > 0) && (
            <div className="text-secondary text-[10px] uppercase tracking-widest font-bold mt-1">
              {stats.wins}W · {stats.totalPoints}PTS
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function SetupScreen() {
  const [players, setPlayers] = useAtom(playersAtom);
  const [settings, setSettings] = useAtom(tournamentSettingsAtom);
  const [tournamentCreated] = useAtom(tournamentCreatedAtom);
  const createTournament = useSetAtom(createTournamentAtom);

  const [newPlayerName, setNewPlayerName] = useState('');
  const [excludedIdsArr, setExcludedIdsArr] = useAtom(excludedPlayerIdsAtom);
  const [allStats] = useAtom(playerStatsAtom);
  const excludedIds = new Set(excludedIdsArr);

  const addPlayer = () => {
    const name = newPlayerName.trim();
    if (!name) return;
    const player: TournamentPlayer = {
      id: crypto.randomUUID(),
      name,
    };
    setPlayers([...players, player]);
    setNewPlayerName('');
  };

  const removePlayer = (id: string) => {
    setPlayers(players.filter((p) => p.id !== id));
    setExcludedIdsArr(excludedIdsArr.filter((eid) => eid !== id));
  };

  const toggleExclude = (id: string) => {
    if (excludedIds.has(id)) {
      setExcludedIdsArr(excludedIdsArr.filter((eid) => eid !== id));
    } else {
      setExcludedIdsArr([...excludedIdsArr, id]);
    }
  };

  const includedPlayers = players.filter((p) => !excludedIds.has(p.id));

  const handleCreateTournament = () => {
    createTournament(includedPlayers);
  };

  return (
    <div className="pb-40">
      {/* Hero Section */}
      <section className="mb-12 relative">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary/20 blur-[80px] rounded-full" />
        <h2 className="text-5xl font-extrabold tracking-tighter leading-none mb-4 z-10 relative">
          Build Your <br />
          <span className="text-secondary">Arena</span>
        </h2>
        <p className="text-on-surface-variant font-medium leading-relaxed max-w-[80%]">
          Configure the bracket and assemble your elite roster for the upcoming
          tournament.
        </p>
      </section>

      {/* Tournament Config Cards */}
      <div className="grid grid-cols-1 gap-6 mb-12">
        {/* Format Toggle */}
        <div className="bg-surface-container-low p-8 rounded-[2rem] relative overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <span className="text-secondary font-bold text-[10px] uppercase tracking-widest">
              Game Format
            </span>
            <span className="material-symbols-outlined text-white/20">
              format_list_bulleted
            </span>
          </div>
          <div className="flex bg-surface-container-highest p-1.5 rounded-full">
            <button
              onClick={() =>
                setSettings({ ...settings, gameType: 'singles' })
              }
              className={`flex-1 py-3 rounded-full text-sm font-extrabold active:scale-95 transition-all ${
                settings.gameType === 'singles'
                  ? 'bg-primary text-on-primary'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Singles (1v1)
            </button>
            <button
              onClick={() =>
                setSettings({ ...settings, gameType: 'doubles' })
              }
              className={`flex-1 py-3 rounded-full text-sm font-extrabold active:scale-95 transition-all ${
                settings.gameType === 'doubles'
                  ? 'bg-primary text-on-primary'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Doubles (2v2)
            </button>
          </div>
        </div>

        {/* Bracket Type Toggle */}
        <div className="bg-surface-container-low p-8 rounded-[2rem] relative overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <span className="text-secondary font-bold text-[10px] uppercase tracking-widest">
              Bracket Type
            </span>
            <span className="material-symbols-outlined text-white/20">
              account_tree
            </span>
          </div>
          <div className="flex bg-surface-container-highest p-1.5 rounded-full">
            <button
              onClick={() =>
                setSettings({ ...settings, type: 'single_elimination' })
              }
              className={`flex-1 py-3 rounded-full text-sm font-extrabold active:scale-95 transition-all ${
                settings.type === 'single_elimination'
                  ? 'bg-primary text-on-primary'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Single Elim
            </button>
            <button
              onClick={() =>
                setSettings({ ...settings, type: 'double_elimination' })
              }
              className={`flex-1 py-3 rounded-full text-sm font-extrabold active:scale-95 transition-all ${
                settings.type === 'double_elimination'
                  ? 'bg-primary text-on-primary'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Double Elim
            </button>
          </div>
        </div>

        {/* Player Entry */}
        <div className="bg-surface-container-low p-8 rounded-[2rem] relative overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <span className="text-secondary font-bold text-[10px] uppercase tracking-widest">
              Recruit Players
            </span>
            <span className="material-symbols-outlined text-white/20">
              person_add
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addPlayer();
              }}
              placeholder="Enter player name..."
              className="w-full bg-surface-container-highest border-none rounded-full py-4 px-6 text-on-surface placeholder:text-white/20 focus:ring-2 focus:ring-secondary transition-all outline-none"
            />
            <button
              onClick={addPlayer}
              className="kinetic-gradient w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform shrink-0"
            >
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Roster Section */}
      {players.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold">Active Roster</h3>
            <span className="bg-surface-container-highest text-tertiary-fixed font-bold px-4 py-1 rounded-full text-xs">
              {includedPlayers.length} / {players.length} PLAYERS
            </span>
          </div>
          <div className="space-y-4">
            {players.map((player) => (
              <SwipeablePlayerRow
                key={player.id}
                player={player}
                excluded={excludedIds.has(player.id)}
                stats={allStats[player.name]}
                onToggleExclude={() => toggleExclude(player.id)}
                onRemove={() => removePlayer(player.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-10 left-0 w-full px-6 z-40 pointer-events-none">
        <button
          disabled={includedPlayers.length < 2 || tournamentCreated}
          onClick={handleCreateTournament}
          className="pointer-events-auto w-full kinetic-gradient text-on-primary py-6 rounded-full font-extrabold text-lg uppercase tracking-widest kinetic-shadow-strong flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Start Tournament</span>
          <span className="material-symbols-outlined font-extrabold">bolt</span>
        </button>
      </div>
    </div>
  );
}
