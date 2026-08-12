import { useState } from 'react';
import { motion } from 'framer-motion';
import { Network, Users, Bot, Plus, Trash2, AlertCircle } from 'lucide-react';
import { SectionHead, EmptyState } from './shared';

export default function OrgStructure({ teams = [], isLoading, error, canManage, onCreateTeam, onDeleteTeam, full }) {
  const [name, setName] = useState('');

  if (isLoading) {
    return <div className="rounded-2xl border border-white/10 bg-white/[.025] p-8 text-center text-xs text-zinc-500">Loading teams…</div>;
  }

  if (error) {
    return <EmptyState icon={AlertCircle} title="Could not load teams" desc="Please try again in a moment." />;
  }

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreateTeam?.(name.trim());
    setName('');
  };

  return (
    <div>
      <SectionHead icon={Network} title="Team Structure" grad="from-violet-500 to-indigo-500" count={`${teams.length} teams`} />

      {canManage && (
        <form onSubmit={submit} className="mb-4 flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New team name"
            className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" />
          <button type="submit" className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-medium text-white">
            <Plus className="h-3.5 w-3.5" />Create Team
          </button>
        </form>
      )}

      {teams.length === 0 ? (
        <EmptyState icon={Network} title="No teams yet" desc="Create your first team to group members." />
      ) : (
        <div className="space-y-2">
          {teams.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.04, 0.2) }}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.02] p-3">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500"><Network className="h-4 w-4 text-white" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">{t.name}</p>
                {t.description && <p className="truncate text-[10px] text-zinc-500">{t.description}</p>}
              </div>
              <span className="flex items-center gap-1 text-[10px] text-zinc-500"><Users className="h-3 w-3" />{t.team_members?.length ?? 0}</span>
              {full && canManage && (
                <button title="Delete team" onClick={() => onDeleteTeam?.(t.id)}
                  className="grid h-7 w-7 place-items-center rounded-lg border border-white/5 text-red-400 hover:bg-white/5">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {full && (
        <div className="mt-4">
          <EmptyState icon={Bot} title="Department hierarchy not available yet" desc="PalladiumAI currently tracks flat teams; nested departments aren't modelled in the backend yet." />
        </div>
      )}
    </div>
  );
}
