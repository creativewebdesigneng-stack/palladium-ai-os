import { useState } from 'react';
import { X, Wrench, Plus } from 'lucide-react';

export default function CustomServerForm({ onSave, onClose }) {
  const [form, setForm] = useState({ name: '', url: '', auth: 'none', desc: '', tools: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    onSave({
      name: form.name || 'My MCP Server',
      url: form.url,
      auth: form.auth,
      desc: form.desc,
      tools: form.tools.split(',').map(t => t.trim()).filter(Boolean),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button className="absolute inset-0 bg-black/60" onClick={onClose} />
      <form onSubmit={submit} className="relative flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#0c0d13]">
        <div className="flex items-center gap-2 border-b border-white/10 p-4">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500"><Wrench className="h-4 w-4 text-white" /></span>
          <p className="text-sm font-semibold text-white">Add custom MCP server</p>
          <button type="button" onClick={onClose} className="ml-auto text-zinc-500 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          <Field label="Name"><input value={form.name} onChange={e => set('name', e.target.value)} placeholder="My MCP Server" className="input" /></Field>
          <Field label="Server URL"><input value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://mcp.example.com/sse" className="input" /></Field>
          <Field label="Authentication">
            <select value={form.auth} onChange={e => set('auth', e.target.value)} className="input">
              <option value="none" className="bg-[#10121a]">None</option>
              <option value="bearer" className="bg-[#10121a]">Bearer token</option>
              <option value="basic" className="bg-[#10121a]">Basic auth</option>
              <option value="oauth" className="bg-[#10121a]">OAuth</option>
            </select>
          </Field>
          <Field label="Description"><textarea value={form.desc} onChange={e => set('desc', e.target.value)} rows={3} placeholder="What this server exposes…" className="input" /></Field>
          <Field label="Tools (comma separated)"><input value={form.tools} onChange={e => set('tools', e.target.value)} placeholder="run_query, search_docs" className="input" /></Field>
        </div>
        <div className="border-t border-white/10 p-3">
          <button type="submit" className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-violet-500 py-2.5 text-sm font-medium text-white hover:bg-violet-600"><Plus className="h-4 w-4" />Save custom server</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return <label className="block"><span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</span>{children}</label>;
}