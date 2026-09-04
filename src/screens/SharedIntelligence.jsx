import { useMemo, useState } from 'react';
import { Network, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { useServerFn } from '@tanstack/react-start';
import PageHeader from '@/components/palladium/PageHeader';
import { useSessionReady } from '@/lib/useSessionReady';
import { friendlyMessage } from '@/lib/errors';
import { Failed } from '@/components/business/live';
import {
  getWorkspaceIntelligenceGraph,
  planWorkspaceCollaboration,
} from '@/lib/workspaces/shared-intelligence.functions';

const control = 'w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-violet-400/40';

export default function SharedIntelligence() {
  const session = useSessionReady();
  const graphFn = useServerFn(getWorkspaceIntelligenceGraph);
  const planFn = useServerFn(planWorkspaceCollaboration);
  const [graph, setGraph] = useState(null);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [agentId, setAgentId] = useState('agent-preview');
  const [action, setAction] = useState('read');
  const [allowEdits, setAllowEdits] = useState(false);
  const [allowExecution, setAllowExecution] = useState(false);

  async function refreshGraph() {
    setBusy(true); setError('');
    try { setGraph(await graphFn({ data: { minConfidence: 0.6, maxNodes: 250, maxEdges: 750 } })); }
    catch (err) { setError(friendlyMessage(err)); }
    finally { setBusy(false); }
  }

  async function evaluate() {
    setBusy(true); setError('');
    try {
      setPlan(await planFn({ data: {
        members: [{ id: agentId.trim(), kind: 'agent', role: 'agent' }],
        requests: [{ actorId: agentId.trim(), action, resourceId: 'workspace-context' }],
        allowAgentEdits: allowEdits,
        allowAgentExecution: allowExecution,
        allowExternalSharing: false,
        requireHumanApprovalForAgentMutations: true,
      } }));
    } catch (err) { setError(friendlyMessage(err)); }
    finally { setBusy(false); }
  }

  const domains = useMemo(() => {
    const counts = new Map();
    for (const node of graph?.graph?.nodes ?? []) counts.set(node.domain, (counts.get(node.domain) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [graph]);

  if (session === 'no') return <Failed message="Sign in to use Shared Intelligence." />;

  return <>
    <PageHeader eyebrow="Blackstar · Collaboration" title="Shared Intelligence" description="Govern human-agent collaboration and inspect a relationship graph built from your real agent workspaces, context timeline, projects, agents, tags and Knowledge-linked provenance." action={<button onClick={refreshGraph} disabled={busy} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300 disabled:opacity-50"><RefreshCw className="h-3.5 w-3.5" />Refresh graph</button>} />
    {error && <div className="mb-4 rounded-xl border border-red-400/20 bg-red-500/[.06] p-3 text-sm text-red-200">{error}</div>}

    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
      <div className="space-y-4">
        <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
          <div className="flex items-center gap-3"><Network className="h-5 w-5 text-violet-300" /><div><h2 className="font-medium text-white">Workspace intelligence graph</h2><p className="text-xs text-zinc-500">Only authenticated, user-scoped workspace records are included.</p></div></div>
          {!graph ? <button onClick={refreshGraph} disabled={busy || session !== 'yes'} className="mt-6 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40">Build intelligence graph</button> : <>
            <div className="mt-5 grid gap-3 sm:grid-cols-5">
              <Metric label="Workspaces" value={graph.summary.workspaceCount} />
              <Metric label="Context" value={graph.summary.contextCount} />
              <Metric label="Nodes" value={graph.summary.nodeCount} />
              <Metric label="Edges" value={graph.summary.edgeCount} />
              <Metric label="Provenance" value={graph.summary.provenanceLinkedNodes} />
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">{domains.map(([domain, count]) => <div key={domain} className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="flex items-center justify-between"><span className="text-xs text-zinc-400">{domain}</span><span className="text-xs font-medium text-violet-200">{count}</span></div></div>)}</div>
            <div className="mt-5 max-h-72 overflow-auto rounded-xl border border-white/10 bg-black/20 p-3">
              {(graph.graph.edges ?? []).slice(0, 80).map((edge) => <div key={edge.id} className="border-b border-white/5 py-2 last:border-0"><p className="text-xs text-zinc-300">{edge.relation}</p><p className="mt-1 break-all font-mono text-[10px] text-zinc-600">{edge.from} → {edge.to}</p></div>)}
            </div>
          </>}
        </section>
      </div>

      <aside className="space-y-4">
        <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
          <div className="flex items-center gap-3"><Users className="h-5 w-5 text-violet-300" /><div><h2 className="font-medium text-white">Collaboration policy check</h2><p className="text-xs text-zinc-500">Preview an agent action against Blackstar workspace boundaries.</p></div></div>
          <label className="mt-4 block text-xs text-zinc-500">Agent identity</label><input value={agentId} onChange={(e) => setAgentId(e.target.value)} className={`${control} mt-1`} />
          <label className="mt-4 block text-xs text-zinc-500">Action</label><select value={action} onChange={(e) => setAction(e.target.value)} className={`${control} mt-1 bg-[#11131a]`}>{['read','comment','propose','edit','execute','approve','share'].map((value) => <option key={value} value={value}>{value}</option>)}</select>
          <label className="mt-4 flex items-center gap-2 text-xs text-zinc-400"><input type="checkbox" checked={allowEdits} onChange={(e) => setAllowEdits(e.target.checked)} />Allow agent edits</label>
          <label className="mt-2 flex items-center gap-2 text-xs text-zinc-400"><input type="checkbox" checked={allowExecution} onChange={(e) => setAllowExecution(e.target.checked)} />Allow agent execution</label>
          <button onClick={evaluate} disabled={busy || !agentId.trim()} className="mt-5 w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40">Evaluate action</button>
          {plan && <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300" /><p className="text-sm font-medium text-white">{plan.executable ? 'Policy evaluated' : 'Action blocked'}</p></div><p className="mt-2 text-xs text-zinc-400">{plan.decisions?.[0]?.reason}</p><p className="mt-2 text-[11px] text-zinc-600">Human approval required: {plan.requiresApproval ? 'Yes' : 'No'}</p></div>}
        </section>
        <section className="rounded-2xl border border-violet-400/15 bg-violet-500/[.04] p-4 text-[11px] leading-5 text-violet-100/70">Agent mutations remain governed by human approval by default. This screen does not bypass the existing runtime, approval requests, Knowledge permissions or workspace ownership rules.</section>
      </aside>
    </div>
  </>;
}

function Metric({ label, value }) { return <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-[10px] uppercase tracking-wide text-zinc-600">{label}</p><p className="mt-1 text-lg font-semibold text-white">{value ?? 0}</p></div>; }
