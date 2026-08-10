import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Power, Settings, Play, UserPlus, CheckCircle2 } from 'lucide-react';
import { STATUS_STYLE, CATEGORIES } from './skillsData';

export default function ToolDetailDrawer({ tool, onClose, onToggle }) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  if (!tool) return null;
  const st = STATUS_STYLE[tool.status];
  const cat = CATEGORIES.find((c) => c.id === tool.category);
  const CI = cat?.icon;

  const runTest = () => {
    setTesting(true); setTestResult(null);
    setTimeout(() => { setTesting(false); setTestResult(tool.status === 'Disabled' ? 'fail' : 'pass'); }, 1100);
  };

  return (
    <div className="fixed inset-0 z-50">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 260 }} className="absolute right-0 top-0 flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-[#0b0c12]">
        <div className="border-b border-white/10 p-4">
          <div className="flex items-start gap-2.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 text-violet-300 ring-1 ring-violet-400/20">{CI && <CI className="h-5 w-5" />}</span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-white">{tool.name}</h2>
              <p className="text-[11px] text-zinc-500">v{tool.version} · {tool.category} · {tool.auth}</p>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
          <p className="mt-3 text-xs text-zinc-400">{tool.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium ${st.bg} ${st.text}`}><span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{tool.status}</span>
            <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-zinc-400">{tool.agents} agents</span>
          </div>
        </div>

        {/* actions */}
        <div className="flex flex-wrap gap-2 border-b border-white/10 p-4">
          <button onClick={() => onToggle(tool)} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${tool.status === 'Enabled' ? 'border border-white/10 text-zinc-300 hover:bg-white/5' : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'}`}>
            <Power className="h-3.5 w-3.5" />{tool.status === 'Enabled' ? 'Disable' : 'Enable'}
          </button>
          <button className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 hover:bg-white/5"><Settings className="h-3.5 w-3.5" />Configure</button>
          <button onClick={runTest} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 hover:bg-white/5">{testing ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent" /> : <Play className="h-3.5 w-3.5" />}{testing ? 'Testing…' : 'Test'}</button>
          <button className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 hover:bg-white/5"><UserPlus className="h-3.5 w-3.5" />Assign to Agent</button>
        </div>

        {testResult && (
          <div className={`mx-4 mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] ${testResult === 'pass' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-400/10 text-rose-300'}`}>
            <CheckCircle2 className="h-3.5 w-3.5" />{testResult === 'pass' ? 'Test passed — tool responded in 240ms' : 'Test failed — tool is disabled'}
          </div>
        )}

        {/* details */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <Section title="Permissions">
            <div className="flex flex-wrap gap-1.5">
              {tool.permissions.map((p) => <span key={p} className="rounded-lg bg-violet-500/10 px-2 py-1 text-[11px] text-violet-200 ring-1 ring-violet-400/20">{p}</span>)}
            </div>
          </Section>

          <Section title="Agents using it">
            <div className="space-y-2">
              {tool.agentNames.map((n) => (
                <div key={n} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-violet-500/20 text-[11px] text-violet-200">{n[0]}</span>
                  <p className="text-xs text-zinc-200">{n}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Schema">
            <div className="space-y-2">
              <Field label="Input" value={tool.input} mono />
              <Field label="Output" value={tool.output} mono />
              <Field label="API Endpoint" value={tool.endpoint} mono />
              <Field label="Authentication" value={tool.auth} />
            </div>
          </Section>
        </div>
      </motion.aside>
    </div>
  );
}

function Section({ title, children }) {
  return <div><h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{title}</h4>{children}</div>;
}
function Field({ label, value, mono }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-zinc-600">{label}</p>
      <p className={`mt-0.5 break-all text-[11px] text-zinc-300 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}