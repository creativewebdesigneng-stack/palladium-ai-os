import { useState } from 'react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';

export default function CustomServerForm({ onSave, onClose }) {
  const [form, setForm] = useState({ name: '', slug: '', endpointUrl: '', authHeaderName: '', authHeaderValue: '', tools: '' });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const set = (key, value) => setForm(previous => ({ ...previous, [key]: value }));
  const submit = async event => {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      await onSave({ name: form.name, slug: form.slug, endpointUrl: form.endpointUrl,
        authHeaderName: form.authHeaderName || null, authHeaderValue: form.authHeaderValue || null,
        allowedToolNames: form.tools.split(',').map(value => value.trim()).filter(Boolean),
        enabled: false, requiresApproval: true });
      setForm(previous => ({ ...previous, authHeaderValue: '' }));
      onClose();
    } catch {
      setError('Configuration could not be certified and saved. Check your fields and the required audit service before retrying. Refresh the registry to check whether a disabled configuration was stored.');
    } finally { setPending(false); }
  };
  return <Sheet open onOpenChange={open=>{if(!open&&!pending)onClose();}}>
    <SheetContent aria-describedby="external-server-description" className="w-full max-w-md bg-[#0c0d13] p-0 sm:max-w-md" onEscapeKeyDown={event=>{if(pending)event.preventDefault();}} onPointerDownOutside={event=>{if(pending)event.preventDefault();}}>
    <form onSubmit={submit} className="flex h-full flex-col">
      <div className="border-b border-white/10 p-4 pr-10">
        <SheetTitle className="text-sm font-semibold text-white">Register disabled MCP server</SheetTitle>
        <SheetDescription id="external-server-description" className="mt-2 text-xs text-zinc-400">Prepare a disabled configuration for review.</SheetDescription>
      </div>
      <fieldset disabled={pending} className="flex-1 space-y-3 overflow-y-auto p-4">
        <p className="text-xs leading-5 text-zinc-400">Use a reviewed Streamable HTTP endpoint. Saving keeps tools disabled and approval required. It does not contact the provider or certify security review.</p>
        <Field label="Name"><input required maxLength={120} value={form.name} onChange={e=>set('name',e.target.value)} className="input"/></Field>
        <Field label="Slug"><input required maxLength={63} pattern="[a-z0-9][a-z0-9_-]*" value={form.slug} onChange={e=>set('slug',e.target.value)} placeholder="reviewed-memory" className="input"/></Field>
        <Field label="HTTPS MCP endpoint"><input required type="url" maxLength={2048} value={form.endpointUrl} onChange={e=>set('endpointUrl',e.target.value)} placeholder="https://your-service.example/mcp" className="input"/></Field>
        <Field label="Authentication header name (optional)"><input maxLength={64} value={form.authHeaderName} onChange={e=>set('authHeaderName',e.target.value)} placeholder="Authorization" className="input"/></Field>
        <Field label="Authentication header value (optional)"><input type="password" autoComplete="new-password" maxLength={8192} value={form.authHeaderValue} onChange={e=>set('authHeaderValue',e.target.value)} placeholder="Bearer …" className="input"/></Field>
        <Field label="Allowed tool names (comma separated)"><textarea required rows={3} value={form.tools} onChange={e=>set('tools',e.target.value)} placeholder="search, read" className="input"/></Field>
        <p className="text-[11px] leading-5 text-zinc-500">Provide 1–200 exact names from reviewed provider documentation. Credentials are encrypted server-side. Licensing, tenant isolation and security scanning remain required before activation.</p>
        {error&&<p role="alert" className="text-xs text-rose-300">{error}</p>}
      </fieldset>
      <div className="border-t border-white/10 p-3"><button disabled={pending} type="submit" className="w-full rounded-xl bg-violet-500 py-2.5 text-sm text-white disabled:opacity-40">{pending?'Saving configuration…':'Save disabled configuration'}</button></div>
    </form>
  </SheetContent></Sheet>;
}
function Field({label,children}) { return <label className="block"><span className="mb-1 block text-xs text-zinc-400">{label}</span>{children}</label>; }
