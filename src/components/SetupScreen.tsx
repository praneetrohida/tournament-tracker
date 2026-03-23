import { useState } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import {
  playersAtom,
  tournamentSettingsAtom,
  createTournamentAtom,
  tournamentCreatedAtom,
} from '@/lib/store';
import type { TournamentPlayer } from '@/lib/tournamentManager';

export function SetupScreen() {
  const [players, setPlayers] = useAtom(playersAtom);
  const [settings, setSettings] = useAtom(tournamentSettingsAtom);
  const [tournamentCreated] = useAtom(tournamentCreatedAtom);
  const createTournament = useSetAtom(createTournamentAtom);

  const [newPlayerName, setNewPlayerName] = useState('');

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
  };

  const handleCreateTournament = () => {
    createTournament(true);
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
              {players.length} PLAYERS
            </span>
          </div>
          <div className="space-y-4">
            {players.map((player, index) => (
              <div
                key={player.id}
                className="bg-surface-container p-5 rounded-full flex items-center gap-4 group pl-5 pr-6"
              >
                <div className="w-10 h-10 rounded-full bg-surface-container-highest overflow-hidden shrink-0">
                  <img src={`https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(player.name)}`} alt={player.name} className="w-full h-full" />
                </div>
                <div className="font-bold text-lg leading-none flex-1">
                  {player.name}
                </div>
                <button
                  onClick={() => removePlayer(player.id)}
                  className="opacity-30 group-hover:opacity-100 transition-opacity hover:text-error active:scale-95"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-10 left-0 w-full px-6 z-40 pointer-events-none">
        <button
          disabled={players.length < 2 || tournamentCreated}
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
