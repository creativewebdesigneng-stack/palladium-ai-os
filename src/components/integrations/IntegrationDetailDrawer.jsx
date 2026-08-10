import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, Zap, Bot, Workflow, FolderKanban, Settings, ShieldCheck, History, Cpu } from 'lucide-react';
import { StatusBadge, CapChips, Avatar } from './shared';
import { AGENT_ACCESS, WORKFLOW_ACCESS, PERMISSIONS, ALL_INTEGRATIONS, RECENT_ACTIVITY, API_USAGE } from './integrationsData';

const TABS = ['Overview','Capabilities','Permissions','API Usage','Activity','Agents','Workflows','Settings'];

export default function IntegrationDetailDrawer({ item, onClose }) {
  if (!item) return null;
  const connected = item.status === 'connected';
  const agents = AGENT_ACCESS.filter(a => a.integration === item.id);
  const workflows = WORKFLOW_ACCESS.filter(w => w.integration === item.id);
  const activity = RECENT_ACTIVITY.filter(a => a.target === item.name).slice(0, 6);
  const maxBar = Math.max(...API_USAGE.trend);

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          onClick={e => e.stopPropagation()} className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-[#0b0c12]/95 backdrop-blur-xl">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-black/40 px-5 py-4 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <span className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${item.grad} shadow-lg`}><item.icon className="h-5 w-5 text-white" /></span>
              <div>
                <h3 className="text-base font-semibold text-white">{item.name}</h3>
                <div className="flex items-center gap-2"><StatusBadge status={item.status} /><span className="text-[10px] text-zinc-500">{item.category}</span></div>
              </div>
            </div>
            <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-zinc-400 hover:bg-white/5"><X className="h-4 w-4" /></button>
          </div>

          <div className="space-y-5 p-5">
            {/* Description + connect */}
            <p className="text-sm leading-relaxed text-zinc-400">{item.desc}</p>
            <div className="flex flex-wrap gap-2">
              {connected ? (
                <>
                  <button className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3.5 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5"><Settings className="h-3.5 w-3.5" />Configure</button>
                  <button className="flex items-center gap-1.5 rounded-lg border border-red-400/20 bg-red-500/10 px-3.5 py-2 text-xs font-medium text-red-300 hover:bg-red-500/20">Disconnect</button>
                </>
              ) : (
                <button className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-xs font-medium text-white"><Zap className="h-3.5 w-3.5" />Connect Integration</button>
              )}
            </div>

            {/* Metrics */}
            {connected && item.metrics?.requests > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {[['Requests', item.metrics.requests > 999 ? `${(item.metrics.requests/1000).toFixed(1)}K` : item.metrics.requests], ['Success Rate', `${item.metrics.success}%`], ['Avg Latency', `${item.metrics.latency}ms`]].map(([l, v]) => (
                  <div key={l} className="rounded-xl border border-white/10 bg-white/[.03] p-3"><p className="text-[10px] text-zinc-500">{l}</p><p className="text-lg font-semibold text-white">{v}</p></div>
                ))}
              </div>
            )}

            {/* Capabilities */}
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-white"><Cpu className="h-3.5 w-3.5 text-violet-400" />Capabilities</h4>
              <div className="flex flex-wrap gap-1.5">{item.capabilities.map(c => <span key={c} className="rounded-lg border border-white/10 bg-white/[.03] px-2.5 py-1 text-xs text-zinc-300">{c}</span>)}</div>
            </div>

            {/* Models */}
            {item.models?.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-white"><Bot className="h-3.5 w-3.5 text-violet-400" />Available Models</h4>
                <div className="flex flex-wrap gap-1.5">{item.models.map(m => <span key={m} className="rounded-lg bg-violet-500/10 px-2.5 py-1 text-xs text-violet-300 ring-1 ring-violet-400/20">{m}</span>)}</div>
              </div>
            )}

            {/* Permissions */}
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-white"><ShieldCheck className="h-3.5 w-3.5 text-violet-400" />Permissions</h4>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {PERMISSIONS.map(p => (
                  <div key={p.name} className={`flex items-center gap-1.5 rounded-lg border p-2 ${p.sensitive ? 'border-amber-400/20 bg-amber-400/5' : 'border-white/10 bg-white/[.02]'}`}>
                    <span className={`grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br ${p.grad}`}><p.icon className="h-3 w-3 text-white" /></span>
                    <span className="text-[11px] text-zinc-300">{p.name}</span>
                    {p.sensitive && <span className="ml-auto text-[8px] font-medium text-amber-400">!</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Connected Agents */}
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-white"><Bot className="h-3.5 w-3.5 text-violet-400" />Connected Agents</h4>
              {agents.length ? agents.map(a => (
                <div key={a.agent} className="mb-1.5 flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[.02] p-2">
                  <Avatar initials={a.avatar} grad={a.grad} />
                  <div className="min-w-0 flex-1"><p className="text-xs font-medium text-white">{a.agent}</p><p className="text-[10px] text-zinc-500">{a.perms.join(' · ')}</p></div>
                  <span className={`h-5 w-9 rounded-full p-0.5 ${a.enabled ? 'bg-emerald-400/30' : 'bg-white/10'}`}><span className={`block h-4 w-4 rounded-full ${a.enabled ? 'translate-x-4 bg-emerald-400' : 'bg-zinc-500'}`} /></span>
                </div>
              )) : <p className="text-[11px] text-zinc-600">No agents using this integration yet.</p>}
            </div>

            {/* Connected Workflows */}
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-white"><Workflow className="h-3.5 w-3.5 text-violet-400" />Connected Workflows</h4>
              {workflows.length ? workflows.map(w => (
                <div key={w.workflow} className="mb-1.5 flex items-center gap-2 rounded-lg border border-white/5 bg-white/[.02] p-2">
                  <FolderKanban className="h-3.5 w-3.5 text-zinc-500" />
                  <div className="min-w-0 flex-1"><p className="text-xs font-medium text-white">{w.workflow}</p><p className="text-[10px] text-zinc-500">{w.lastRun} · {w.requests} requests · {w.errors} errors</p></div>
                  <StatusBadge status={w.status} />
                </div>
              )) : <p className="text-[11px] text-zinc-600">No workflows using this integration yet.</p>}
            </div>

            {/* API Usage chart */}
            {connected && (
              <div>
                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-white"><Activity className="h-3.5 w-3.5 text-violet-400" />API Usage (12h)</h4>
                <div className="flex h-24 items-end gap-1 rounded-xl border border-white/10 bg-black/20 p-2">
                  {API_USAGE.trend.map((v, i) => (
                    <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${(v / maxBar) * 100}%` }} transition={{ delay: i * 0.04 }}
                      className="flex-1 rounded-t bg-gradient-to-t from-violet-600 to-indigo-500" />
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-white"><History className="h-3.5 w-3.5 text-violet-400" />Recent Activity</h4>
              {activity.length ? activity.map((a, i) => (
                <div key={i} className="mb-1.5 flex items-center gap-2 rounded-lg border border-white/5 bg-white/[.02] p-2">
                  <span className={`grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br ${a.grad}`}><a.icon className="h-3 w-3 text-white" /></span>
                  <p className="flex-1 text-[11px] text-zinc-300"><span className="font-medium text-white">{a.who}</span> {a.what} <span className="font-medium text-violet-400">{a.target}</span></p>
                  <span className="text-[10px] text-zinc-600">{a.time}</span>
                </div>
              )) : <p className="text-[11px] text-zinc-600">No recent activity.</p>}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}