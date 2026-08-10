import { motion } from 'framer-motion';
import { Bot, Workflow, FolderKanban, ToggleRight, ToggleLeft, Settings } from 'lucide-react';
import { AGENT_ACCESS, WORKFLOW_ACCESS, ALL_INTEGRATIONS, PERMISSIONS } from './integrationsData';
import { SectionHead, StatusBadge, Avatar } from './shared';

export function AgentAccess() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
      <SectionHead icon={Bot} title="Agent Access" grad="from-violet-500 to-purple-500" />
      <div className="space-y-2">
        {AGENT_ACCESS.map((a, i) => {
          const it = ALL_INTEGRATIONS.find(x => x.id === a.integration);
          return (
            <motion.div key={a.agent} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
              <Avatar initials={a.avatar} grad={a.grad} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">{a.agent}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                  <span>→</span>
                  {it && <span className={`grid h-4 w-4 place-items-center rounded bg-gradient-to-br ${it.grad}`}><it.icon className="h-2.5 w-2.5 text-white" /></span>}
                  <span className="font-medium text-zinc-300">{it?.name || a.integration}</span>
                  <span className="text-zinc-600">· {a.perms.join(', ')}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button className="rounded-lg border border-white/10 px-2.5 py-1 text-[10px] text-zinc-400 hover:bg-white/5">Permissions</button>
                <button className={`grid h-7 w-12 place-items-center rounded-full transition ${a.enabled ? 'bg-emerald-400/20' : 'bg-white/10'}`}>
                  <span className={`block h-5 w-5 rounded-full transition ${a.enabled ? 'translate-x-5 bg-emerald-400' : 'translate-x-0.5 bg-zinc-500'}`} />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export function WorkflowAccess() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
      <SectionHead icon={Workflow} title="Workflow Access" grad="from-blue-500 to-indigo-500" />
      <div className="space-y-2">
        {WORKFLOW_ACCESS.map((w, i) => {
          const it = ALL_INTEGRATIONS.find(x => x.id === w.integration);
          return (
            <motion.div key={w.workflow} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
              <FolderKanban className="h-4 w-4 text-zinc-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{w.workflow}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                  {it && <span className={`grid h-4 w-4 place-items-center rounded bg-gradient-to-br ${it.grad}`}><it.icon className="h-2.5 w-2.5 text-white" /></span>}
                  <span className="font-medium text-zinc-300">{it?.name || w.integration}</span>
                  <span>· Last run {w.lastRun}</span>
                </div>
              </div>
              <div className="hidden text-right text-[10px] sm:block">
                <p className="font-semibold text-white">{w.requests.toLocaleString()}</p>
                <p className="text-zinc-600">requests</p>
              </div>
              <div className="hidden text-right text-[10px] sm:block">
                <p className={`font-semibold ${w.errors > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{w.errors}</p>
                <p className="text-zinc-600">errors</p>
              </div>
              <StatusBadge status={w.status} />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export function PermissionsMatrix() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
      <SectionHead icon={Settings} title="Permission Types" grad="from-amber-500 to-orange-500" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {PERMISSIONS.map((p, i) => (
          <motion.div key={p.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className={`rounded-xl border p-2.5 ${p.sensitive ? 'border-amber-400/20 bg-amber-400/5' : 'border-white/10 bg-black/20'}`}>
            <div className="mb-1.5 flex items-center justify-between">
              <span className={`grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br ${p.grad}`}><p.icon className="h-3.5 w-3.5 text-white" /></span>
              {p.sensitive && <span className="rounded bg-amber-400/20 px-1 py-0.5 text-[8px] font-medium text-amber-400">Sensitive</span>}
            </div>
            <p className="text-xs font-semibold text-white">{p.name}</p>
            {p.sensitive && <p className="mt-0.5 text-[9px] text-amber-400/70">Grants write access</p>}
          </motion.div>
        ))}
      </div>
    </div>
  );
}