import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save } from 'lucide-react';
import { MEMORY_SCOPES } from './memoryData';

export default function EditMemoryModal({ open, onClose, onSubmit, entry }) {
  const [form, setForm] = useState({ title: '', content: '', source: '', importance: 'medium', scope: 'private', pinned: false });
  useEffect(() => {
    if (open && entry) {
      setForm({
        title: entry.title || '',
        content: entry.content || '',
        source: entry.source || '',
        importance: entry.importance || 'medium',
        scope: entry.scope || 'private',
        pinned: !!entry.pinned,
      });
    }
  }, [open, entry]);
  if (!open) return null;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.content.trim()) return;
    onSubmit(entry.id, form);
  };

  return (
    <div className="fixed inset-0 z-50">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="absolute left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#0b0c12] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Edit memory</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-3.5">
          <Field label="Title (optional)">
            <input value={form.title} onChange={(e) => set('title', e.target.value)} className="input" />
          </Field>
          <Field label="Memory">
            <textarea value={form.content} onChange={(e) => set('content', e.target.value)} rows={4} className="input resize-none" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Source">
              <input value={form.source} onChange={(e) => set('source', e.target.value)} className="input" />
            </Field>
            <Field label="Importance">
              <select value={form.importance} onChange={(e) => set('importance', e.target.value)} className="input">
                {['critical', 'high', 'medium', 'low'].map((i) => <option key={i} value={i}>{i.charAt(0).toUpperCase() + i.slice(1)}</option>)}
              </select>
            </Field>
          </div>
          <div className="flex items-center justify-between">
            <Field label="Scope">
              <select value={form.scope} onChange={(e) => set('scope', e.target.value)} className="input">
                {MEMORY_SCOPES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-[11px] text-zinc-300">
              <input type="checkbox" checked={form.pinned} onChange={(e) => set('pinned', e.target.checked)} className="accent-violet-500" />Pinned
            </label>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-white/10 px-3.5 py-2 text-sm text-zinc-300 hover:bg-white/5">Cancel</button>
          <button onClick={submit} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3.5 py-2 text-sm font-medium text-white"><Save className="h-4 w-4" />Save</button>
        </div>
      </motion.div>
    </div>
  );
}

function Field({ label, children }) {
  return <div><label className="mb-1 block text-[11px] font-medium text-zinc-400">{label}</label>{children}</div>;
}