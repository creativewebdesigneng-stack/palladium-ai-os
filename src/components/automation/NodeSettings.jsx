import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, Tag, FileText, ArrowDownLeft, ArrowUpRight, Variable,
  Repeat, Clock, AlertTriangle, ScrollText, Lock, Brain,
} from 'lucide-react';
import { NODE_SETTINGS } from './automationData';

const TABS = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'io', label: 'Inputs/Outputs', icon: ArrowDownLeft },
  { id: 'logic', label: 'Variables', icon: Variable },
  { id: 'error', label: 'Error Handling', icon: AlertTriangle },
  { id: 'advanced', label: 'Advanced', icon: Lock },
];

export default function NodeSettings() {
  const [tab, setTab] = useState('general');
  const ns = NODE_SETTINGS;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[.025]">
      <div className="border-b border-white/10 p-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-lg">
            <Brain className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-white">{ns.name}</h3>
            <p className="text-[11px] text-zinc-500">{ns.type}</p>
          </div>
          <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-400">Running</span>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-white/10 px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${tab === t.id ? 'bg-white text-black' : 'text-zinc-400 hover:bg-white/5'}`}
          >
            <t.icon className="h-3.5 w-3.5" />{t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 [scrollbar-width:thin]">
        {tab === 'general' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <Field label="Node Name" icon={Tag}>
              <input defaultValue={ns.name} className="input" />
            </Field>
            <Field label="Description" icon={FileText}>
              <textarea defaultValue={ns.description} rows={3} className="input resize-none" />
            </Field>
            <Field label="Timeout" icon={Clock}>
              <input defaultValue={ns.timeout} className="input" />
            </Field>
            <Field label="Logging Level" icon={ScrollText}>
              <select className="input" defaultValue={ns.logging}>
                <option>Verbose</option><option>Info</option><option>Warn</option><option>Error</option>
              </select>
            </Field>
          </motion.div>
        )}
        {tab === 'io' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-zinc-400"><ArrowDownLeft className="h-3.5 w-3.5 text-cyan-400" />Inputs</p>
              <div className="space-y-1">
                {ns.inputs.map(inp => (
                  <div key={inp} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-xs text-zinc-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />{inp}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-zinc-400"><ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />Outputs</p>
              <div className="space-y-1">
                {ns.outputs.map(out => (
                  <div key={out} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-xs text-zinc-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{out}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
        {tab === 'logic' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-zinc-400"><Variable className="h-3.5 w-3.5" />Variables</p>
            {ns.variables.map(v => (
              <div key={v} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5">
                <code className="text-xs text-violet-400">{v}</code>
              </div>
            ))}
            <button className="mt-2 w-full rounded-lg border border-dashed border-white/15 py-2 text-xs text-zinc-500 hover:border-violet-400/40 hover:text-violet-400">+ Add Variable</button>
          </motion.div>
        )}
        {tab === 'error' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <Field label="Retry Attempts" icon={Repeat}>
              <input type="number" defaultValue={ns.retry.attempts} className="input" />
            </Field>
            <Field label="Retry Delay" icon={Clock}>
              <input defaultValue={ns.retry.delay} className="input" />
            </Field>
            <Field label="Backoff Strategy">
              <select className="input" defaultValue={ns.retry.backoff}>
                <option>exponential</option><option>linear</option><option>fixed</option>
              </select>
            </Field>
            <Field label="On Error" icon={AlertTriangle}>
              <select className="input" defaultValue={ns.errorHandling}>
                <option>Continue to next node</option><option>Stop workflow</option><option>Retry</option><option>Notify admin</option>
              </select>
            </Field>
          </motion.div>
        )}
        {tab === 'advanced' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <Field label="Permissions" icon={Lock}>
              <div className="flex flex-wrap gap-1">
                {ns.permissions.map(p => (
                  <span key={p} className="rounded-md bg-amber-400/10 px-2 py-0.5 text-[11px] text-amber-300">{p}</span>
                ))}
              </div>
            </Field>
            <Field label="Conditions" icon={Tag}>
              <textarea rows={2} placeholder="if lead_score > 80" className="input resize-none font-mono text-xs" />
            </Field>
            <button className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 py-2 text-xs font-medium text-white hover:opacity-90">Save Settings</button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
        {Icon && <Icon className="h-3.5 w-3.5 text-zinc-500" />}{label}
      </label>
      {children}
    </div>
  );
}