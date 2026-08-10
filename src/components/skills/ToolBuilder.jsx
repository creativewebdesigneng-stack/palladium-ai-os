import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wrench, Plus, Check } from 'lucide-react';
import { CATEGORIES, AUTH_METHODS, PERMISSION_OPTIONS } from './skillsData';

export default function ToolBuilder({ open, onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', description: '', input: '', output: '', endpoint: '', auth: 'API Key', permissions: [] });
  if (!open) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const togglePerm = (p) => setForm((f) => ({ ...f, permissions: f.permissions.includes(p) ? f.permissions.filter((x) => x !== p) : [...f.permissions, p] }));
  const submit = () => { if (!form.name.trim()) return; onCreate({ ...form, id: 'tool-' + Date.now(), category: 'APIs', version: '0.1.0', agents: 0, agentNames: [], status: 'Disabled' }); setForm({ name: '', description: '', input: '', output: '', endpoint: '', auth: 'API Key', permissions: [] }); onClose(); };

  return (
    <div className="fixed inset-0 z-50">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 12 }} transition={{ duration: 0.2 }} className="absolute left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#0b0c12] p-5 shadow-2xl">
        <div className="mb-4 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white"><Wrench className="h-4 w-4" /></span>
          <div className="flex-1"><h3 className="text-sm font-semibold text-white">Tool Builder</h3><p className="text-[11px] text-zinc-500">Define a new capability agents can use.</p></div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
        </div>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
          <Labeled label="Name"><input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Weather Lookup" className="input" /></Labeled>
          <Labeled label="Description"><textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} placeholder="What does this tool do?" className="input resize-none" /></Labeled>
          <div className="grid gap-3 sm:grid-cols-2">
            <Labeled label="Input"><textarea value={form.input} onChange={(e) => set('input', e.target.value)} rows={2} placeholder='{ query: string }' className="input resize-none font-mono" /></Labeled>
            <Labeled label="Output"><textarea value={form.output} onChange={(e) => set('output', e.target.value)} rows={2} placeholder='{ result: any }' className="input resize-none font-mono" /></Labeled>
          </div>
          <Labeled label="API Endpoint"><input value={form.endpoint} onChange={(e) => set('endpoint', e.target.value)} placeholder="https://api.example.com/v1/tool" className="input font-mono" /></Labeled>
          <Labeled label="Authentication">
            <select value={form.auth} onChange={(e) => set('auth', e.target.value)} className="input">
              {AUTH_METHODS.map((a) => <option key={a} value={a} className="bg-[#101119]">{a}</option>)}
            </select>
          </Labeled>
          <Labeled label="Permissions">
            <div className="flex flex-wrap gap-1.5">
              {PERMISSION_OPTIONS.map((p) => {
                const on = form.permissions.includes(p);
                return (
                  <button key={p} onClick={() => togglePerm(p)} className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition ${on ? 'bg-violet-500/15 text-violet-200 ring-1 ring-violet-400/30' : 'border border-white/10 text-zinc-400 hover:bg-white/5'}`}>{on && <Check className="h-3 w-3" />}{p}</button>
                );
              })}
            </div>
          </Labeled>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5">Cancel</button>
          <button onClick={submit} className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-medium text-white"><Plus className="h-3.5 w-3.5" />Create tool</button>
        </div>
      </motion.div>
    </div>
  );
}

function Labeled({ label, children }) {
  return <div><p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">{label}</p>{children}</div>;
}