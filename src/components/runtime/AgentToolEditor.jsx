import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { listAgentToolChoices, getToolFramework, saveToolPermission } from '@/lib/tools/tools.functions';
import { updateAgentTools } from '@/lib/agents/agents.functions';

function ToolPolicy({ agent, tool, permission, onSaved }) {
  const saveFn = useServerFn(saveToolPermission);
  const [domains, setDomains] = useState((permission?.allowed_domains ?? []).join(', '));
  const [approval, setApproval] = useState(permission?.requires_approval ?? true);
  const [enabled, setEnabled] = useState(permission?.enabled ?? true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const save = async () => {
    setBusy(true); setMessage('');
    try {
      await saveFn({ data: { tool: tool.slug, agentId: agent.id, enabled, requiresApproval: approval,
        allowedDomains: domains.split(/[,\n]+/).map(v => v.trim()).filter(Boolean), spendCap: permission?.spend_cap ?? null } });
      setMessage('Policy saved.'); await onSaved();
    } catch (e) { setMessage(e?.message || 'Could not save policy.'); }
    finally { setBusy(false); }
  };
  return <fieldset disabled={busy} className="space-y-2 rounded-lg border border-white/10 p-2 text-xs text-zinc-300">
    <legend>{tool.name || tool.slug} policy</legend>
    <label className="flex gap-2"><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />Permission enabled</label>
    <label className="flex gap-2"><input type="checkbox" checked={approval} onChange={e => setApproval(e.target.checked)} />Require approval</label>
    <label className="block">Allowed domains (comma separated)<input className="mt-1 w-full rounded border border-white/10 bg-black/30 p-2" value={domains} onChange={e => setDomains(e.target.value)} placeholder="httpbingo.org" /></label>
    <button type="button" onClick={save} className="rounded border border-violet-400/25 px-2 py-1">{busy ? 'Saving…' : 'Save tool policy'}</button>
    {message && <p role="status">{message}</p>}
  </fieldset>;
}

export default function AgentToolEditor({ agent, onAgentUpdated }) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const listFn = useServerFn(listAgentToolChoices);
  const frameworkFn = useServerFn(getToolFramework);
  const saveFn = useServerFn(updateAgentTools);
  const catalogue = useQuery({ queryKey: ['agent-tool-catalogue'], queryFn: () => listFn(), enabled: editing, retry: false });
  const framework = useQuery({ queryKey: ['agent-tool-policies', agent.id], queryFn: () => frameworkFn(), enabled: editing, retry: false, staleTime: 0 });
  const save = async () => {
    setBusy(true); setError('');
    try {
      const updated = await saveFn({ data: { id: agent.id, tools: selected, expectedUpdatedAt: agent.updated_at } });
      onAgentUpdated?.(updated); setEditing(false);
    } catch (e) { setError(e?.message || 'Could not save tool assignments.'); }
    finally { setBusy(false); }
  };
  if (!editing) return <button type="button" className="mt-3 rounded-lg border border-violet-400/25 px-3 py-2 text-xs text-violet-200" onClick={() => { setSelected(agent.allowed_tools ?? []); setError(''); setEditing(true); }}>Edit tools & permissions</button>;
  const failed = catalogue.error || framework.error;
  return <div className="mt-3 space-y-3">
    <p className="text-xs text-zinc-400">Select tools for future runs. Save each tool policy separately to set domains and approval requirements. Existing plan and runtime checks still apply.</p>
    {(catalogue.isPending || framework.isPending) && <p role="status" className="text-xs text-zinc-400">Loading tools and policies…</p>}
    {failed && <p role="alert" className="text-xs text-rose-300">Could not load tools or policies. Close and retry.</p>}
    {!failed && !catalogue.isPending && !framework.isPending && <div className="max-h-96 space-y-3 overflow-y-auto">
      {(catalogue.data ?? []).map(tool => {
        const specific = framework.data?.permissions?.find(p => p.tool === tool.slug && p.agent_id === agent.id);
        const inherited = framework.data?.permissions?.find(p => p.tool === tool.slug && !p.agent_id);
        const permission = specific ?? inherited;
        return <div key={tool.slug}>
          <label className="flex gap-2 text-xs text-zinc-200"><input type="checkbox" disabled={busy} checked={selected.includes(tool.slug)} onChange={e => setSelected(old => e.target.checked ? [...old, tool.slug] : old.filter(v => v !== tool.slug))} />{tool.name || tool.slug}</label>
          {selected.includes(tool.slug) && <ToolPolicy key={`${tool.slug}:${JSON.stringify(permission)}`} agent={agent} tool={tool} permission={permission} onSaved={() => framework.refetch()} />}
        </div>;
      })}
      {selected.filter(slug => !catalogue.data?.some(t => t.slug === slug)).map(slug => <label key={slug} className="flex gap-2 text-xs text-zinc-400"><input type="checkbox" disabled={busy} checked onChange={() => setSelected(old => old.filter(v => v !== slug))} />{slug} · unavailable for new assignment</label>)}
    </div>}
    {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
    <div className="flex gap-2 text-xs"><button type="button" disabled={busy || !!failed || catalogue.isPending || framework.isPending || !agent.updated_at} onClick={save} className="rounded bg-violet-600 px-3 py-2 text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save tool assignments'}</button><button type="button" disabled={busy} onClick={() => setEditing(false)} className="px-3 py-2 text-zinc-300">Close</button></div>
  </div>;
}
