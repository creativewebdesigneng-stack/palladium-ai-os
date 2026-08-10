import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { PRIORITIES, AGENTS, TEAMS, DEPARTMENTS, PROJECTS, CATEGORIES } from './tasksData';

const TOOLS = ['Web', 'Docs', 'Email', 'GitHub', 'Sheets', 'Terminal'];

export default function TaskCreateModal({ open, onClose, onCreate }) {
  const [form, setForm] = useState({
    name: '', description: '', priority: 'Medium', agent: AGENTS[0], team: TEAMS[0],
    department: DEPARTMENTS[0], project: PROJECTS[0], category: CATEGORIES[0], dueDate: '', tools: [],
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleTool = (t) => setForm(f => ({ ...f, tools: f.tools.includes(t) ? f.tools.filter(x => x !== t) : [...f.tools, t] }));

  const submit = () => {
    onCreate({
      ...form,
      id: 'task-' + Date.now(),
      status: 'Queued', progress: 0, startDate: new Date().toISOString().slice(0, 10),
      estCompletion: form.dueDate + ' 17:00', actualCompletion: null, model: 'GPT-5',
      dependencies: [], approvals: [], files: [], comments: [], timeline: [{ t: 'now', label: 'Task created' }],
      activity: [{ t: 'now', text: 'Task created' }], outputs: [], logs: '', instructions: '',
    });
    setForm({ name: '', description: '', priority: 'Medium', agent: AGENTS[0], team: TEAMS[0], department: DEPARTMENTS[0], project: PROJECTS[0], category: CATEGORIES[0], dueDate: '', tools: [] });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.97 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/15 bg-[#14151d] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500"><Sparkles className="h-4 w-4 text-white" /></span>
                <h2 className="text-base font-semibold text-white">Create AI Task</h2>
              </div>
              <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="max-h-[70vh] space-y-3 overflow-auto p-5">
              <Input label="Task name" value={form.name} onChange={v => set('name', v)} placeholder="e.g. Research competitor pricing" />
              <Input label="Description" value={form.description} onChange={v => set('description', v)} placeholder="What should the agent do?" textarea />
              <div className="grid grid-cols-2 gap-3">
                <Select label="Priority" value={form.priority} onChange={v => set('priority', v)} options={PRIORITIES} />
                <Select label="Category" value={form.category} onChange={v => set('category', v)} options={CATEGORIES} />
                <Select label="Agent" value={form.agent} onChange={v => set('agent', v)} options={AGENTS} />
                <Select label="Team" value={form.team} onChange={v => set('team', v)} options={TEAMS} />
                <Select label="Department" value={form.department} onChange={v => set('department', v)} options={DEPARTMENTS} />
                <Select label="Project" value={form.project} onChange={v => set('project', v)} options={PROJECTS} />
                <Input label="Due date" value={form.dueDate} onChange={v => set('dueDate', v)} type="date" />
              </div>
              <div>
                <label className="text-xs text-zinc-400">Required tools</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {TOOLS.map(t => (
                    <button key={t} onClick={() => toggleTool(t)} className={`rounded-lg border px-2.5 py-1 text-xs ${form.tools.includes(t) ? 'border-violet-400/40 bg-violet-500/10 text-white' : 'border-white/10 text-zinc-400'}`}>{t}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-white/10 p-4">
              <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-zinc-400 hover:bg-white/5">Cancel</button>
              <button onClick={submit} disabled={!form.name} className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40">Create task</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Input({ label, value, onChange, placeholder, textarea, type = 'text' }) {
  return (
    <div>
      <label className="text-xs text-zinc-400">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={2} className="mt-1.5 w-full resize-none rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-violet-500 placeholder:text-zinc-600" />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="mt-1.5 h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-zinc-200 outline-none focus:border-violet-500 placeholder:text-zinc-600" />
      )}
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="text-xs text-zinc-400">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-zinc-200 outline-none focus:border-violet-500">
        {options.map(o => <option key={o} className="bg-[#14151d]">{o}</option>)}
      </select>
    </div>
  );
}