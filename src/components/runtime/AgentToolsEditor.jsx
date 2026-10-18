import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { getToolFramework, saveToolPermission } from '@/lib/tools/tools.functions';
import { updateAgentTools } from '@/lib/agents/agents.functions';

export default function AgentToolsEditor({ agent, onAgentUpdated }) {
  const load = useServerFn(getToolFramework);
  const savePermission = useServerFn(saveToolPermission);
  const saveTools = useServerFn(updateAgentTools);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState([]);
  const [domains, setDomains] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const framework = useQuery({ queryKey: ['agent-tool-settings', agent.id], queryFn: () => load(), enabled: editing, retry: false, staleTime: 0 });
  const browserSelected = selected.some(tool => tool === 'browser' || tool === 'browser_task');
  const permissionFor = tool => framework.data?.permissions.find(row => row.tool === tool && row.agent_id === agent.id)
    ?? framework.data?.permissions.find(row => row.tool === tool && !row.agent_id);
  const begin = () => { setSelected([...(agent.allowed_tools ?? [])]); setDomains(''); setError(''); setEditing(true); };
  const save = async () => {
    if (saving || !framework.data || framework.error) return;
    setSaving(true); setError('');
    try {
      if (browserSelected) {
        const allowedDomains = [...new Set(domains.split(/[,\s]+/).filter(Boolean))];
        if (!allowedDomains.length) throw new Error('Enter allowed browser domains before saving.');
        // Save policy before assignment. A failed second step is reported and
        // never silently broadens the agent's tool list.
        for (const tool of selected.filter(tool => tool === 'browser' || tool === 'browser_task')) {
          const policy = permissionFor(tool);
          await savePermission({ data: { tool, agentId: agent.id, enabled: true,
            requiresApproval: Boolean(policy?.requires_approval || agent.requires_approval),
            allowedDomains, spendCap: policy?.spend_cap ?? null } });
        }
      }
      const updated = await saveTools({ data: { id: agent.id, expectedUpdatedAt: agent.updated_at, tools: selected } });
      onAgentUpdated?.(updated); setEditing(false);
      await framework.refetch();
    } catch (failure) { setError(`${failure?.message || 'Could not save tool settings.'} Permission changes may already be saved; refresh before retrying.`); }
    finally { setSaving(false); }
  };
  if (!editing) return <button type="button" onClick={begin} className="mt-3 rounded-lg border border-violet-400/25 px-3 py-2 text-xs text-violet-200">Edit tools</button>;
  const choices = (framework.data?.tools ?? []).filter(tool => tool.executable && tool.is_active);
  return <div className="mt-3 space-y-3">
    <p className="text-[11px] text-zinc-400">Assignments apply to future runs. Plan limits, domain restrictions and existing approvals are enforced at execution.</p>
    {framework.isPending && <p role="status">Loading tool settings…</p>}
    <fieldset disabled={saving || framework.isPending || Boolean(framework.error)} className="max-h-64 space-y-2 overflow-y-auto">
      <legend className="text-xs text-zinc-300">Agent tools</legend>
      {choices.map(tool => <label key={tool.slug} className="flex items-start gap-2 text-xs text-zinc-300">
        <input type="checkbox" checked={selected.includes(tool.slug)} onChange={event => setSelected(current => event.target.checked ? [...current, tool.slug] : current.filter(slug => slug !== tool.slug))} />
        <span>{tool.name} <span className="text-zinc-500">({tool.slug})</span></span>
      </label>)}
    </fieldset>
    {browserSelected && <label className="block text-xs text-zinc-300">Allowed browser domains
      <input aria-label="Allowed browser domains" value={domains} disabled={saving} onChange={event => setDomains(event.target.value)} placeholder="httpbingo.org" className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 p-2" />
      <span className="mt-1 block text-[11px] text-zinc-500">Enter the complete domain list for this save. Current browser policy: {(permissionFor('browser_task') ?? permissionFor('browser'))?.allowed_domains?.join(', ') || 'None'}. Existing approval requirements remain in force.</span>
    </label>}
    {(error || framework.error) && <p role="alert" className="text-xs text-rose-300">{error || 'Could not load tool permissions. Close and retry.'}</p>}
    <div className="flex gap-2">
      <button type="button" onClick={save} disabled={saving || !agent.updated_at || !framework.data || Boolean(framework.error)} className="rounded-lg bg-violet-600 px-3 py-2 text-xs text-white disabled:opacity-50">{saving ? 'Saving tools…' : 'Save tools'}</button>
      <button type="button" disabled={saving} onClick={() => setEditing(false)} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300">Cancel tool changes</button>
    </div>
  </div>;
}
