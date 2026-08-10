import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save } from 'lucide-react';
import { MiniAvatar } from './wfShared';
import { gradFor } from './normalize';

const PERMISSIONS = [
  { key: 'read_files', label: 'Read files' },
  { key: 'write_files', label: 'Write files' },
  { key: 'send_emails', label: 'Send emails' },
  { key: 'execute_code', label: 'Execute code' },
  { key: 'publish_externally', label: 'Publish externally' },
];

const EMPTY = { name: '', goal: '', lead_agent_id: '', agents: [], permissions: {}, status: 'active' };

export default function CreateDepartmentModal({ open, onClose, onSubmit, agents, team }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (open) {
      setForm(team ? {
        name: team.name || '',
        goal: team.goal || '',
        lead_agent_id: team.lead_agent_id || '',
        agents: team.agents || [],
        permissions: team.permissions || {},
        status: team.status || 'active',
      } : EMPTY);
    }
  }, [open, team]);

  if (!open) return null;

  const toggleAgent = (id) =>
    setForm((f) => ({ ...f, agents: f.agents.includes(id) ? f.agents.filter((x) => x !== id) : [...f.agents, id] }));

  const togglePerm = (key) =>
    setForm((f) => ({ ...f, permissions: { ...f.permissions, [key]: !f.permissions[key] } }));

  const submit = () => {
    if (!form.name.trim()) return;
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="absolute left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#0b0c12] p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">{team ? 'Edit department' : 'New department'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-4">
          <Field label="Department name">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Marketing" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" />
          </Field>

          <Field label="Goal">
            <input value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} placeholder="e.g. Ship Q3 launch campaign" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" />
          </Field>

          <Field label="Assign agents">
            <div className="flex flex-wrap gap-1.5">
              {agents.length ? agents.map((a) => {
                const on = form.agents.includes(a.id);
                return (
                  <button key={a.id} onClick={() => toggleAgent(a.id)} className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] transition ${on ? 'border-violet-400/40 bg-violet-500/15 text-white' : 'border-white/10 text-zinc-300 hover:bg-white/5'}`}>
                    <MiniAvatar letter={(a.name || '?').charAt(0)} grad={gradFor(a.id)} size="h-4 w-4" text="text-[8px]" />
                    {a.name}
                  </button>
                );
              }) : <span className="text-[11px] text-zinc-600">No agents available — create agents first.</span>}
            </div>
          </Field>

          <Field label="Team lead">
            <select value={form.lead_agent_id} onChange={(e) => setForm({ ...form, lead_agent_id: e.target.value })} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200 focus:border-violet-400/40 focus:outline-none">
              <option value="">No lead</option>
              {form.agents.map((id) => {
                const a = agents.find((x) => x.id === id);
                return a ? <option key={id} value={id}>{a.name}</option> : null;
              })}
            </select>
          </Field>

          <Field label="Team permissions">
            <div className="flex flex-wrap gap-1.5">
              {PERMISSIONS.map((p) => {
                const on = !!form.permissions[p.key];
                return (
                  <button key={p.key} onClick={() => togglePerm(p.key)} className={`rounded-lg border px-2.5 py-1.5 text-[11px] transition ${on ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300' : 'border-white/10 text-zinc-400 hover:bg-white/5'}`}>{p.label}</button>
                );
              })}
            </div>
          </Field>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-white/10 px-3.5 py-2 text-sm text-zinc-300 hover:bg-white/5">Cancel</button>
          <button onClick={submit} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3.5 py-2 text-sm font-medium text-white"><Save className="h-4 w-4" />{team ? 'Save' : 'Create'}</button>
        </div>
      </motion.div>
    </div>
  );
}

function Field({ label, children }) {
  return <div><label className="mb-1.5 block text-[11px] font-medium text-zinc-400">{label}</label>{children}</div>;
}