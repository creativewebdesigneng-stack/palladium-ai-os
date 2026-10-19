import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { listAgentConnectorChoices, updateAgentConnectors } from '@/lib/agents/agents.functions';

/** Edits the existing allowed_providers array. Does not create OAuth tokens or bypass tool policy. */
export default function AgentConnectorEditor({ agent, onAgentUpdated }) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const listFn = useServerFn(listAgentConnectorChoices);
  const saveFn = useServerFn(updateAgentConnectors);
  const choices = useQuery({
    queryKey: ['agent-connector-choices', agent.id],
    queryFn: () => listFn(),
    enabled: editing,
    staleTime: 0,
    retry: false,
  });

  const save = async () => {
    if (saving) return;
    setSaving(true); setError('');
    try {
      const updated = await saveFn({ data: {
        id: agent.id, providers: selected, expectedUpdatedAt: agent.updated_at,
      } });
      onAgentUpdated?.(updated);
      setEditing(false);
    } catch (failure) {
      setError(failure?.message || 'Could not save the agent connector assignments.');
    } finally {
      setSaving(false);
    }
  };

  if (!editing) return <div className="mt-2 space-y-2 text-xs">
    <div className="flex flex-wrap gap-1.5">
      {(agent.allowed_providers ?? []).length
        ? agent.allowed_providers.map(id => <span key={id} className="rounded-lg bg-white/5 px-2 py-1 text-zinc-300">{id}</span>)
        : <span className="text-zinc-500">No connected apps assigned to this agent</span>}
    </div>
    <button type="button" className="rounded-lg border border-violet-400/25 px-3 py-2 text-violet-200"
      onClick={() => { setSelected(agent.allowed_providers ?? []); setError(''); setEditing(true); }}>
      Manage agent connectors
    </button>
  </div>;

  const rows = choices.data ?? [];
  const connected = rows.filter(row => row.connected);
  const disconnected = rows.filter(row => !row.connected);
  const connectedIds = new Set(connected.map(row => row.id));
  const invalid = selected.some(id => !connectedIds.has(id));
  return <div className="mt-3 space-y-3 text-xs text-zinc-300">
    <p className="text-zinc-400">Only apps connected to your account can be assigned. Assigning an app also enables the existing Connected Service tool; all provider, plan and approval policies continue to apply.</p>
    <a href="/integrations" className="inline-block rounded-lg border border-violet-400/25 px-3 py-2 text-violet-200">Connect or manage apps in Integrations</a>
    {choices.isPending && <p role="status">Checking your connections…</p>}
    {choices.error && <p role="alert" className="text-rose-300">Could not check connected apps. Try again.</p>}
    {!choices.isPending && !choices.error && <div className="max-h-72 space-y-2 overflow-y-auto">
      {connected.length === 0 && <p role="status" className="text-amber-200/80">No verified app connection found. Connect an app in Integrations first.</p>}
      {connected.map(row => <label key={row.id} className="flex gap-2 rounded-lg border border-emerald-400/15 p-2">
        <input type="checkbox" checked={selected.includes(row.id)} disabled={saving}
          onChange={e => setSelected(old => e.target.checked ? [...new Set([...old, row.id])] : old.filter(id => id !== row.id))} />
        <span>{row.name}<span className="ml-2 text-emerald-300">Connected</span>
          <span className="block text-zinc-500">{row.transport}{row.accountLabel ? ` · ${row.accountLabel}` : ''}</span>
        </span>
      </label>)}
      {selected.filter(id => !connectedIds.has(id)).map(id => <label key={id} className="flex gap-2 rounded-lg border border-amber-400/20 p-2">
        <input type="checkbox" checked disabled={saving} onChange={() => setSelected(old => old.filter(value => value !== id))} />
        <span>{id} · disconnected or unavailable; remove or reconnect before saving</span>
      </label>)}
      {disconnected.length > 0 && <p className="text-zinc-500">{disconnected.length} more providers are available through Integrations after connection.</p>}
    </div>}
    {invalid && !choices.isPending && <p role="alert" className="text-amber-200">Remove or reconnect unavailable providers before saving.</p>}
    {error && <p role="alert" className="text-rose-300">{error}</p>}
    <div className="flex gap-2">
      <button type="button" onClick={save}
        disabled={saving || choices.isPending || !!choices.error || invalid || !agent.updated_at}
        className="rounded-lg bg-violet-600 px-3 py-2 text-white disabled:opacity-50">
        {saving ? 'Saving…' : 'Save connector assignments'}
      </button>
      <button type="button" onClick={() => setEditing(false)} disabled={saving}
        className="rounded-lg border border-white/10 px-3 py-2">Close</button>
    </div>
  </div>;
}
