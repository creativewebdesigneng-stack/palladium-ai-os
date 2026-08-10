import { Users, Plus, Pencil, Crown } from 'lucide-react';
import { SectionHead, MiniAvatar } from './wfShared';
import { gradFor } from './normalize';

const STATUS_CLS = {
  active: 'bg-emerald-400/10 text-emerald-400',
  paused: 'bg-amber-400/10 text-amber-400',
  archived: 'bg-white/5 text-zinc-500',
};

export default function DepartmentGrid({ teams, agents, onCreate, onEdit }) {
  const nameById = {};
  for (const a of agents) nameById[a.id] = a.name;

  return (
    <section className="mb-8">
      <SectionHead icon={Users} title="Departments & teams" desc="organise agents into departments" action={
        <button onClick={onCreate} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-200 hover:bg-white/5"><Plus className="h-3.5 w-3.5" />New department</button>
      } />

      {teams.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {teams.map((t) => {
            const members = (t.agents || []).filter(Boolean);
            const leadName = t.lead_agent_id ? nameById[t.lead_agent_id] : '';
            const perms = t.permissions || {};
            const permKeys = Object.keys(perms).filter((k) => perms[k]);
            return (
              <div key={t.id} className="flex flex-col rounded-2xl border border-white/10 bg-white/[.03] p-4">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600" />
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <span className={`ml-auto rounded px-1.5 py-0.5 text-[10px] ${STATUS_CLS[t.status] || STATUS_CLS.active}`}>{t.status || 'active'}</span>
                </div>
                {t.goal && <p className="mt-1.5 text-[11px] text-zinc-500">Goal: {t.goal}</p>}
                {leadName && <p className="mt-1 flex items-center gap-1 text-[10px] text-zinc-400"><Crown className="h-3 w-3 text-amber-400" />Lead: {leadName}</p>}

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {members.length ? members.map((id) => (
                    <span key={id} className="flex items-center gap-1.5 rounded-md bg-white/5 px-1.5 py-1 text-[10px] text-zinc-200">
                      <MiniAvatar letter={(nameById[id] || '?').charAt(0)} grad={gradFor(id)} size="h-4 w-4" text="text-[8px]" />
                      {nameById[id] || 'Unknown'}
                    </span>
                  )) : <span className="text-[10px] text-zinc-600">No agents assigned</span>}
                </div>

                {permKeys.length ? (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {permKeys.map((k) => <span key={k} className="rounded bg-violet-500/10 px-1.5 py-0.5 text-[10px] text-violet-300">{k}</span>)}
                  </div>
                ) : null}

                <button onClick={() => onEdit(t)} className="mt-auto flex items-center gap-1.5 self-start pt-3 text-[11px] text-zinc-400 hover:text-white">
                  <Pencil className="h-3 w-3" />Edit department
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[.02] px-6 py-12 text-center">
          <Users className="mx-auto h-8 w-8 text-zinc-600" />
          <p className="mt-3 text-sm font-medium text-white">No departments yet</p>
          <p className="mt-1 text-xs text-zinc-500">Group your agents into teams like Marketing, Sales or Engineering.</p>
          <button onClick={onCreate} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3.5 py-2 text-sm font-medium text-white"><Plus className="h-4 w-4" />Create department</button>
        </div>
      )}
    </section>
  );
}