import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, Loader2, FileText } from 'lucide-react';
import { MEMORY_SCOPES, CATEGORIES } from './memoryData';
import { READABLE_HINT } from '@/lib/memory/documentText';

const CATS = CATEGORIES.knowledge;
const EMPTY = { category: 'document', scope: 'shared', agent_id: '', title: '', content: '', importance: 'high', file: null };

export default function UploadKnowledgeModal({ open, onClose, onSubmit, agents, uploading }) {
  const [form, setForm] = useState(EMPTY);
  if (!open) return null;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const canSubmit = Boolean(form.file) || form.content.trim().length > 20;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="absolute left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#0b0c12] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Upload knowledge</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-3.5">
          <Field label="Document">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/15 bg-black/20 px-3 py-3 text-zinc-300 hover:border-violet-400/40">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-violet-500/15"><FileText className="h-4 w-4 text-violet-300" /></span>
              <span className="min-w-0 flex-1 text-xs">
                {form.file ? <span className="truncate text-white">{form.file.name}</span> : <span className="text-zinc-500">Choose a file to upload…</span>}
              </span>
              <input type="file" className="hidden" onChange={(e) => set('file', e.target.files?.[0] || null)} />
            </label>
            <p className="mt-1.5 text-[10px] text-zinc-500">{READABLE_HINT} Files are kept in private storage.</p>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select value={form.category} onChange={(e) => set('category', e.target.value)} className="input">
                {CATS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Scope">
              <select value={form.scope} onChange={(e) => set('scope', e.target.value)} className="input">
                {MEMORY_SCOPES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Agent (optional)">
            <select value={form.agent_id} onChange={(e) => set('agent_id', e.target.value)} className="input">
              <option value="">Organisation-wide</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>

          <Field label="Title (optional)">
            <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Brand Guidelines v4" className="input" />
          </Field>

          <Field label="Summary / notes (optional)">
            <textarea value={form.content} onChange={(e) => set('content', e.target.value)} rows={3} placeholder="What does this document contain?" className="input resize-none" />
          </Field>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} disabled={uploading} className="rounded-xl border border-white/10 px-3.5 py-2 text-sm text-zinc-300 hover:bg-white/5 disabled:opacity-50">Cancel</button>
          <button onClick={submit} disabled={uploading || !canSubmit} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3.5 py-2 text-sm font-medium text-white disabled:opacity-50">
            {uploading ? <><Loader2 className="h-4 w-4 animate-spin" />Uploading…</> : <><Upload className="h-4 w-4" />Upload</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Field({ label, children }) {
  return <div><label className="mb-1 block text-[11px] font-medium text-zinc-400">{label}</label>{children}</div>;
}