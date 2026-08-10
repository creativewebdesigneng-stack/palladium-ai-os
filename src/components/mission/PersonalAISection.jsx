import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { Plus, Settings2, Trash2, ShieldCheck, Wallet, Clock } from 'lucide-react';
import { PERSONAL_CATEGORIES, ADVISORY_NOTICE, AUTONOMY_LABEL, AGENT_TEMPLATES, CATEGORY_LABEL, formatMoney } from '@/lib/mission/catalog';

function CategoryCard({ cat, count, onPick }) {
  const Icon = Icons[cat.icon] ?? Icons.Wand2;
  return (
    <motion.button
      type="button"
      whileHover={{ y: -3 }}
      onClick={() => onPick?.(cat)}
      className="rounded-2xl border border-white/10 bg-black/20 p-3.5 text-left transition hover:border-violet-400/30"
    >
      <div className="flex items-start justify-between">
        <span className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${cat.grad} text-white shadow-lg shadow-black/40`}>
          <Icon className="h-4.5 w-4.5" />
        </span>
        {count > 0 && <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] text-violet-200">{count}</span>}
      </div>
      <p className="mt-2.5 text-xs font-semibold text-white">{cat.label}</p>
      <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-500">{cat.desc}</p>
    </motion.button>
  );
}

function AgentCard({ agent, onEdit, onDelete, onRun }) {
  const cat = PERSONAL_CATEGORIES.find((c) => c.id === agent.category);
  const Icon = Icons[cat?.icon ?? 'Wand2'] ?? Icons.Wand2;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-white/[.03] p-4 transition hover:border-violet-400/25"
    >
      <div className="flex items-start gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${cat?.grad ?? 'from-violet-500 to-indigo-600'} text-white shadow-lg shadow-black/40`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{agent.name}</p>
          <p className="text-[11px] text-zinc-500">{CATEGORY_LABEL[agent.category] ?? agent.category}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] ${agent.status === 'active' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-zinc-400'}`}>{agent.status}</span>
      </div>

      {agent.purpose && <p className="mt-2.5 line-clamp-3 text-[11px] leading-relaxed text-zinc-400">{agent.purpose}</p>}

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-white/5 pt-2.5 text-[10px] text-zinc-500">
        <span className="inline-flex items-center gap-1 text-violet-300"><ShieldCheck className="h-3 w-3" />{AUTONOMY_LABEL[agent.autonomy] ?? agent.autonomy}</span>
        {agent.budget_limit != null && <span className="inline-flex items-center gap-1"><Wallet className="h-3 w-3" />{formatMoney(agent.budget_limit, agent.currency)}</span>}
        {agent.schedule && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{agent.schedule}</span>}
        <span>{(agent.allowed_tools ?? []).length} tools</span>
      </div>

      <div className="mt-3 flex gap-2">
        <button onClick={() => onRun?.(agent)} className="flex-1 rounded-lg bg-white/5 px-3 py-1.5 text-[11px] font-medium text-zinc-200 transition hover:bg-white/10">Give a task</button>
        <button onClick={() => onEdit?.(agent)} aria-label={`Configure ${agent.name}`} className="rounded-lg border border-white/10 p-1.5 text-zinc-400 transition hover:text-white"><Settings2 className="h-3.5 w-3.5" /></button>
        <button onClick={() => onDelete?.(agent)} aria-label={`Delete ${agent.name}`} className="rounded-lg border border-white/10 p-1.5 text-zinc-500 transition hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    </motion.div>
  );
}

export default function PersonalAISection({ agents = [], loading, onCreate, onEdit, onDelete, onRun, onTemplate }) {
  const counts = agents.reduce((acc, a) => ({ ...acc, [a.category]: (acc[a.category] ?? 0) + 1 }), {});

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Icons.User className="h-4 w-4 text-fuchsia-400" />
          <h2 className="text-sm font-semibold text-white">Personal AI</h2>
          <p className="text-[11px] text-zinc-500">agents for the areas of your life</p>
          <button onClick={() => onCreate?.()} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-violet-900/30">
            <Plus className="h-3.5 w-3.5" />New personal agent
          </button>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {PERSONAL_CATEGORIES.map((cat) => <CategoryCard key={cat.id} cat={cat} count={counts[cat.id] ?? 0} onPick={(c) => onCreate?.(c.id)} />)}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {Object.entries(ADVISORY_NOTICE).map(([key, text]) => (
            <p key={key} className="rounded-xl border border-white/10 bg-black/25 p-3 text-[10px] leading-relaxed text-zinc-500">
              <span className="font-semibold text-zinc-300">{CATEGORY_LABEL[key]}: </span>{text}
            </p>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <div className="mb-4 flex items-center gap-2">
          <Icons.Bot className="h-4 w-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-white">Your agents</h2>
          <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-zinc-400">{agents.length}</span>
        </div>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-white/5" />)}</div>
        ) : agents.length === 0 ? (
          <div>
            <p className="text-xs text-zinc-500">No personal agents yet. Start from a template:</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {AGENT_TEMPLATES.map((t) => (
                <button key={t.name} onClick={() => onTemplate?.(t)} className="rounded-xl border border-white/10 bg-black/20 p-3 text-left transition hover:border-violet-400/30">
                  <p className="text-xs font-semibold text-white">{t.name}</p>
                  <p className="mt-1 line-clamp-2 text-[10px] text-zinc-500">{t.purpose}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {agents.map((a) => <AgentCard key={a.id} agent={a} onEdit={onEdit} onDelete={onDelete} onRun={onRun} />)}
            </div>
            <div className="mt-4 border-t border-white/5 pt-3">
              <p className="text-[10px] uppercase tracking-wider text-zinc-600">Add from a template</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {AGENT_TEMPLATES.map((t) => (
                  <button key={t.name} onClick={() => onTemplate?.(t)} className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-zinc-400 transition hover:border-violet-400/30 hover:text-white">+ {t.name}</button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
