import { Cpu, Wrench, Brain } from 'lucide-react';
import AgentSkillsRegistryPanel from '@/components/agents/AgentSkillsRegistryPanel';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { getModelRuntimeOverview } from '@/lib/runtime/model-management.functions';
import AgentToolEditor from './AgentToolEditor';
import AgentConnectorEditor from './AgentConnectorEditor';
import { updateAgentModel, updateAgentInstructions } from '@/lib/agents/agents.functions';
import { WIZARD_MODELS } from '@/components/agents/agentsData';
import { AGENT_MODEL_CHOICES } from '@/lib/agents/agent-model-selection';

function ModelChoice({ agent, onAgentUpdated }) {
  const overviewFn = useServerFn(getModelRuntimeOverview);
  const saveFn = useServerFn(updateAgentModel);
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [choice, setChoice] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const overview = useQuery({ queryKey: ['model-runtime-overview'], queryFn: () => overviewFn({ data: {} }), enabled: editing, retry: false, staleTime: 0 });
  const connected = new Set((overview.data?.providers ?? []).filter(row => row.configured).map(row => row.id));
  const selected = AGENT_MODEL_CHOICES[choice];
  const save = async () => {
    if (saving || !selected || !connected.has(selected.provider)) return;
    setSaving(true); setError('');
    try {
      const updated = await saveFn({ data: { id: agent.id, choice, expectedUpdatedAt: agent.updated_at } });
      onAgentUpdated?.(updated);
      setEditing(false);
      await queryClient.invalidateQueries({ queryKey: ['model-runtime-overview'] });
    } catch (failure) { setError(failure?.message || 'Could not change the agent model.'); }
    finally { setSaving(false); }
  };
  if (!editing) return <button type="button" onClick={() => { setEditing(true); setChoice(''); setError(''); }} className="mt-3 rounded-lg border border-violet-400/25 px-3 py-2 text-xs text-violet-200">Change model</button>;
  return <div className="mt-3 space-y-2">
    <label className="block text-xs text-zinc-400">Model for future runs
      <select aria-label="Model for future runs" value={choice} disabled={saving || overview.isPending || Boolean(overview.error)} onChange={event => setChoice(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-[#110d19] p-2 text-xs text-white">
        <option value="">Choose a connected model</option>
        {WIZARD_MODELS.map(row => <option key={row.id} value={row.id} disabled={!connected.has(row.provider)}>{row.name} · {row.provider}{connected.has(row.provider) ? '' : ' · connection required'}</option>)}
      </select>
    </label>
    <p className="text-[11px] text-zinc-400">Future task context goes to the selected provider. Current runs keep their saved configuration. Model access and quota are checked when a run starts.</p>
    {overview.isPending && <p role="status" className="text-xs text-zinc-400">Checking connections…</p>}
    {(error || overview.error) && <p role="alert" className="text-xs text-rose-300">{error || 'Could not check model connections. Close and retry.'}</p>}
    <div className="flex gap-2">
      <button type="button" disabled={saving || !agent.updated_at || !selected || !connected.has(selected.provider) || Boolean(overview.error)} onClick={save} className="rounded-lg bg-violet-600 px-3 py-2 text-xs text-white disabled:opacity-50">{saving ? 'Saving model…' : 'Save model'}</button>
      <button type="button" disabled={saving} onClick={() => setEditing(false)} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300">Cancel model change</button>
    </div>
  </div>;
}


function InstructionEditor({ agent, onAgentUpdated }) {
  const saveFn = useServerFn(updateAgentInstructions);
  const [editing, setEditing] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const save = async () => {
    if (saving) return;
    setSaving(true); setError(''); setSaved(false);
    try {
      const updated = await saveFn({ data: { id: agent.id, instructions, expectedUpdatedAt } });
      onAgentUpdated?.(updated);
      setEditing(false); setSaved(true);
    } catch (failure) { setError(failure?.message || 'Could not save instructions.'); }
    finally { setSaving(false); }
  };
  return <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
    <p className="text-xs font-medium text-white">Standing instructions</p>
    <p className="mt-2 text-[11px] text-zinc-400">Instructions guide future runs. Tool assignments, domain restrictions and approval controls still apply.</p>
    {editing ? <div className="mt-3 space-y-2">
      <label className="block text-xs text-zinc-300">Instructions
        <textarea aria-label="Standing instructions" rows={8} maxLength={8000} disabled={saving} value={instructions} onChange={event => setInstructions(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-2 text-xs text-white" />
      </label>
      {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={saving || !expectedUpdatedAt} onClick={save} className="rounded-lg bg-violet-600 px-3 py-2 text-xs text-white disabled:opacity-50">{saving ? 'Saving instructions…' : 'Save instructions'}</button>
        <button type="button" disabled={saving} onClick={() => setEditing(false)} className="px-3 py-2 text-xs text-zinc-300">Cancel</button>
      </div>
    </div> : <>
      <p className="mt-3 max-h-48 overflow-y-auto whitespace-pre-wrap break-words text-xs text-zinc-300">{agent.instructions || 'No standing instructions configured.'}</p>
      <button type="button" onClick={() => { setInstructions(agent.instructions ?? ''); setExpectedUpdatedAt(agent.updated_at); setError(''); setSaved(false); setEditing(true); }} className="mt-3 rounded-lg border border-violet-400/25 px-3 py-2 text-xs text-violet-200">Edit instructions</button>
      {saved && <p role="status" className="mt-2 text-xs text-emerald-300">Instructions saved.</p>}
    </>}
  </div>;
}

function Row({ k, v }) {
  return <div className="flex justify-between"><dt className="text-zinc-500">{k}</dt><dd className="text-zinc-200">{String(v)}</dd></div>;
}

// Right-hand sidebar summarising the agent's model, tools, memory and bounded
// capability registry pulled live from the backend agent record.
export default function AgentConfigPanel({ agent, onAgentUpdated }) {
  const tools = agent.allowed_tools || agent.tools || [];
  return (
    <div className="space-y-3">
      <AgentSkillsRegistryPanel agent={agent} onAgentUpdated={onAgentUpdated} />
      <InstructionEditor key={agent.id} agent={agent} onAgentUpdated={onAgentUpdated} />
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
        <p className="flex items-center gap-2 text-xs font-medium text-white"><Cpu className="h-3.5 w-3.5 text-violet-400" />Model</p>
        <dl className="mt-3 space-y-1.5 text-xs">
          <Row k="Provider" v={agent.model_provider || 'lovable'} />
          <Row k="Model" v={agent.model || '—'} />
          <Row k="Temperature" v={agent.temperature ?? 0.7} />
          <Row k="Max tokens" v={agent.max_tokens ?? 4096} />
          <Row k="Autonomy" v={agent.autonomy || 'assist'} />
        </dl>
        <ModelChoice key={agent.id} agent={agent} onAgentUpdated={onAgentUpdated} />
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
        <p className="flex items-center gap-2 text-xs font-medium text-white"><Wrench className="h-3.5 w-3.5 text-violet-400" />Enabled tools</p>
        <AgentToolEditor key={agent.id} agent={agent} onAgentUpdated={onAgentUpdated} />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tools.length ? tools.map((t) => (
            <span key={t} className="rounded-lg bg-white/5 px-2 py-1 text-[11px] text-zinc-300">{t}</span>
          )) : <span className="text-[11px] text-zinc-600">None configured</span>}
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
        <p className="flex items-center gap-2 text-xs font-medium text-white"><Wrench className="h-3.5 w-3.5 text-violet-400" />Connected apps for this agent</p>
        <AgentConnectorEditor key={agent.id} agent={agent} onAgentUpdated={onAgentUpdated} />
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
        <p className="flex items-center gap-2 text-xs font-medium text-white"><Brain className="h-3.5 w-3.5 text-violet-400" />Memory</p>
        <div className="mt-3 space-y-1 text-[11px] text-zinc-400">
          <div className="flex justify-between">
            <span>Long-term memory</span>
            <span className={agent.memory_enabled === false ? 'text-zinc-600' : 'text-emerald-400'}>{agent.memory_enabled === false ? 'Off' : 'On'}</span>
          </div>
          <div className="flex justify-between">
            <span>Approval required</span>
            <span className={agent.requires_approval ? 'text-amber-300' : 'text-zinc-600'}>{agent.requires_approval ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
