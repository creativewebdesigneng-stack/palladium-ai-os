import { useState } from 'react';
import { X, Upload, Lock, Link2, FileText } from 'lucide-react';

export default function SubmitPluginModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({ name: '', description: '', icon: 'Sparkles', api: '', auth: 'API Key', perms: '', docs: '' });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0c0d13] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Submit a plugin</h3>
            <p className="text-[11px] text-zinc-500">Creator Tools · publish a capability to the marketplace.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-white/5"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-3">
          <Field label="Name"><input value={form.name} onChange={(e) => set('name', e.target.value)} className="input" placeholder="My Plugin" /></Field>
          <Field label="Description"><textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} className="input resize-none" placeholder="What does it do?" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Icon"><input value={form.icon} onChange={(e) => set('icon', e.target.value)} className="input" placeholder="Sparkles" /></Field>
            <Field label="Authentication">
              <select value={form.auth} onChange={(e) => set('auth', e.target.value)} className="input">
                <option>API Key</option><option>OAuth 2.0</option><option>Bearer Token</option><option>None</option>
              </select>
            </Field>
          </div>
          <Field label="API endpoint" icon={Link2}><input value={form.api} onChange={(e) => set('api', e.target.value)} className="input" placeholder="https://api.example.com/v1" /></Field>
          <Field label="Permissions (comma separated)" icon={Lock}><input value={form.perms} onChange={(e) => set('perms', e.target.value)} className="input" placeholder="Read repos, Post comments" /></Field>
          <Field label="Documentation" icon={FileText}><textarea value={form.docs} onChange={(e) => set('docs', e.target.value)} rows={3} className="input resize-none" placeholder="# My Plugin&#10;Markdown docs…" /></Field>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5">Cancel</button>
          <button onClick={() => { onSubmit(form); onClose(); }} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-medium text-white"><Upload className="h-3.5 w-3.5" />Submit</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1 text-[11px] font-medium text-zinc-400">{Icon && <Icon className="h-3 w-3" />}{label}</span>
      {children}
    </label>
  );
}