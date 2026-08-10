import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Save } from 'lucide-react';
import { MEMORY_TYPES, MEMORY_SCOPES, CATEGORIES } from './memoryData';

const EMPTY = { memory_type: 'short_term', category: '', scope: 'private', agent_id: '', title: '', content: '', source: '', importance: 'medium' };

export default function AddMemoryModal({ open, onClose, onSubmit, agents }) {
  const [form, setForm] = useState(EMPTY);
  if (!open) return null;

  const cats = CATEGORIES[form.memory_type] || [];
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.content.trim()) return;
    onSubmit({ ...form, category: form.category || cats[0]?.id || 'conversation' });
  };

  return (
    <div className="fixed inset-0 z-50">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="absolute left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#0b0c12] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Add memory</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Memory type">
              <select value={form.memory_type} onChange={(e) => set('memory_type', e.target.value)} className="input">
                {MEMORY_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Category">
              <select value={form.category || cats[0]?.id} onChange={(e) => set('category', e.target.value)} className="input">
                {cats.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Scope">
              <select value={form.scope} onChange={(e) => set('scope', e.target.value)} className="input">
                {MEMORY_SCOPES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Agent (optional)">
              <select value={form.agent_id} onChange={(e) => set('agent_id', e.target.value)} className="input">
                <option value="">No agent</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Title (optional)">
            <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="A short label" className="input" />
          </Field>

          <Field label="Memory">
            <textarea value={form.content} onChange={(e) => set('content', e.target.value)} rows={4} placeholder="What should be remembered?" className="input resize-none" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Source (optional)">
              <input value={form.source} onChange={(e) => set('source', e.target.value)} placeholder="e.g. onboarding doc" className="input" />
            </Field>
            <Field label="Importance">
              <select value={form.importance} onChange={(e) => set('importance', e.target.value)} className="input">
                {['critical', 'high', 'medium', 'low'].map((i) => <option key={i} value={i}>{i.charAt(0).toUpperCase() + i.slice(1)}</option>)}
              </select>
            </Field>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-white/10 px-3.5 py-2 text-sm text-zinc-300 hover:bg-white/5">Cancel</button>
          <button onClick={submit} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3.5 py-2 text-sm font-medium text-white"><Save className="h-4 w-4" />Save memory</button>
        </div>
      </motion.div>
    </div>
  );
}

function Field({ label, children }) {
  return <div><label className="mb-1 block text-[11px] font-medium text-zinc-400">{label}</label>{children}</div>;
}