import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Boxes, GitBranch, Layers3, Plus, RefreshCw, Search, Sparkles } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import {
  listAgentWorkspaces,
  listContextTimeline,
  promoteContextCardToKnowledge,
  saveAgentWorkspace,
  saveContextCard,
} from '@/lib/workspaces/agent-workspaces.functions';

const EMPTY_WORKSPACE = { id: null, title: '', objective: '', isolation_mode: 'shared', branch_name: '', status: 'draft' };
const EMPTY_CARD = { id: null, workspace_id: '', card_kind: 'note', title: '', body: '', tags: [], source_kind: 'manual', pinned: false };

function Stat({ icon: Icon, label, value }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><div className="flex items-center gap-2 text-zinc-500"><Icon className="h-4 w-4" /><span className="text-xs">{label}</span></div><p className="mt-2 text-2xl font-semibold text-white">{value}</p></div>;
}

export default function AgentWorkspaces() {
  const [tab, setTab] = useState('workspaces');
  const [workspaces, setWorkspaces] = useState([]);
  const [cards, setCards] = useState([]);
  const [workspaceDraft, setWorkspaceDraft] = useState(EMPTY_WORKSPACE);
  const [cardDraft, setCardDraft] = useState(EMPTY_CARD);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function refresh() {
    setError('');
    try {
      const [workspaceResult, cardResult] = await Promise.all([
        listAgentWorkspaces({ data: { limit: 200 } }),
        listContextTimeline({ data: { query, limit: 300 } }),
      ]);
      setWorkspaces(workspaceResult?.workspaces ?? []);
      setCards(cardResult?.cards ?? []);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load agent workspace data.'); }
  }

  useEffect(() => { void refresh(); }, []);

  const running = useMemo(() => workspaces.filter((item) => item.status === 'running').length, [workspaces]);
  const knowledgeCards = useMemo(() => cards.filter((item) => item.knowledge_document_id).length, [cards]);

  async function saveWorkspace() {
    if (!workspaceDraft.title.trim()) return setError('Give the workspace a title.');
    setBusy(true); setError(''); setNotice('');
    try {
      await saveAgentWorkspace({ data: {
        id: workspaceDraft.id ?? undefined,
        title: workspaceDraft.title,
        objective: workspaceDraft.objective,
        isolationMode: workspaceDraft.isolation_mode,
        branchName: workspaceDraft.branch_name || null,
        status: workspaceDraft.status,
      } });
      setWorkspaceDraft(EMPTY_WORKSPACE);
      setNotice('Agent workspace saved. Git and runtime execution remain under PalladiumAI’s existing controls.');
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save workspace.'); }
    finally { setBusy(false); }
  }

  async function saveCard() {
    if (!cardDraft.title.trim()) return setError('Give the context card a title.');
    setBusy(true); setError(''); setNotice('');
    try {
      await saveContextCard({ data: {
        id: cardDraft.id ?? undefined,
        workspaceId: cardDraft.workspace_id || null,
        cardKind: cardDraft.card_kind,
        title: cardDraft.title,
        body: cardDraft.body,
        tags: cardDraft.tags,
        sourceKind: 'manual',
        pinned: cardDraft.pinned,
      } });
      setCardDraft(EMPTY_CARD);
      setNotice('Context card saved to the PalladiumAI timeline.');
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save context card.'); }
    finally { setBusy(false); }
  }

  async function promote(card) {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await promoteContextCardToKnowledge({ data: { id: card.id } });
      setNotice(`Promoted to Knowledge${result?.chunks ? ` with ${result.chunks} chunks` : ''}.`);
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not promote context card.'); }
    finally { setBusy(false); }
  }

  return <>
    <PageHeader
      eyebrow="Agent operations"
      title="Agent Workspaces"
      description="Coordinate parallel agent work with optional worktree isolation metadata, then preserve durable events, tasks, progress and insights on a context timeline that can feed PalladiumAI Knowledge."
      action={<button onClick={refresh} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300"><RefreshCw className="h-3.5 w-3.5" />Refresh</button>}
    />

    {(error || notice) && <div className={`mb-4 rounded-xl border p-3 text-sm ${error ? 'border-red-400/20 bg-red-500/[.06] text-red-200' : 'border-emerald-400/20 bg-emerald-500/[.06] text-emerald-200'}`}>{error || notice}</div>}

    <div className="mb-4 grid gap-3 sm:grid-cols-3">
      <Stat icon={Boxes} label="Workspaces" value={workspaces.length} />
      <Stat icon={Layers3} label="Running" value={running} />
      <Stat icon={BookOpen} label="Timeline in Knowledge" value={knowledgeCards} />
    </div>

    <div className="mb-4 flex gap-2 rounded-xl border border-white/10 bg-white/[.02] p-1">
      {['workspaces', 'timeline'].map((item) => <button key={item} onClick={() => setTab(item)} className={`rounded-lg px-4 py-2 text-xs capitalize ${tab === item ? 'bg-violet-500/15 text-violet-200' : 'text-zinc-500 hover:text-zinc-300'}`}>{item}</button>)}
    </div>

    {tab === 'workspaces' ? <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
      <section className="space-y-3">
        {workspaces.map((workspace) => <button key={workspace.id} onClick={() => setWorkspaceDraft({ ...workspace, branch_name: workspace.branch_name ?? '' })} className="w-full rounded-2xl border border-white/10 bg-white/[.025] p-4 text-left hover:bg-white/[.04]">
          <div className="flex items-start gap-3"><div className="rounded-xl bg-violet-500/10 p-2"><GitBranch className="h-4 w-4 text-violet-300" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-medium text-white">{workspace.title}</p><span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-400">{workspace.status}</span><span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-400">{workspace.isolation_mode}</span></div><p className="mt-1 line-clamp-2 text-xs text-zinc-500">{workspace.objective || 'No objective yet.'}</p>{workspace.branch_name && <p className="mt-2 font-mono text-[11px] text-zinc-600">{workspace.branch_name}</p>}</div></div>
        </button>)}
        {!workspaces.length && <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-zinc-600">No agent workspaces yet.</div>}
      </section>
      <aside className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
        <div className="mb-4 flex items-center justify-between"><h2 className="font-medium text-white">Workspace plan</h2><button onClick={() => setWorkspaceDraft(EMPTY_WORKSPACE)} className="text-zinc-500"><Plus className="h-4 w-4" /></button></div>
        <label className="text-xs text-zinc-500">Title</label><input value={workspaceDraft.title} onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, title: e.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" />
        <label className="mt-4 block text-xs text-zinc-500">Objective</label><textarea value={workspaceDraft.objective} onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, objective: e.target.value })} rows={7} className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" />
        <div className="mt-4 grid grid-cols-2 gap-3"><div><label className="text-xs text-zinc-500">Isolation</label><select value={workspaceDraft.isolation_mode} onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, isolation_mode: e.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"><option value="shared">Shared</option><option value="worktree">Git worktree</option></select></div><div><label className="text-xs text-zinc-500">Status</label><select value={workspaceDraft.status} onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, status: e.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white">{['draft','running','paused','completed','archived'].map((status) => <option key={status} value={status}>{status}</option>)}</select></div></div>
        <label className="mt-4 block text-xs text-zinc-500">Branch / worktree label</label><input value={workspaceDraft.branch_name} onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, branch_name: e.target.value })} placeholder="feat/my-agent-task" className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 font-mono text-sm text-white" />
        <button disabled={busy} onClick={saveWorkspace} className="mt-5 w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">Save workspace</button>
        <p className="mt-3 text-[11px] leading-4 text-zinc-600">Worktree mode records isolation intent. Git commands and code changes still run only through PalladiumAI’s existing GitHub/runtime controls.</p>
      </aside>
    </div> : <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
      <section>
        <div className="mb-3 flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-600" /><input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && refresh()} placeholder="Search timeline" className="w-full rounded-xl border border-white/10 bg-black/20 py-2 pl-9 pr-3 text-sm text-white" /></div><button onClick={refresh} className="rounded-xl border border-white/10 px-3 text-zinc-500"><RefreshCw className="h-4 w-4" /></button></div>
        <div className="space-y-3">{cards.map((card) => <div key={card.id} className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><div className="flex items-start gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-400">{card.card_kind}</span><p className="font-medium text-white">{card.title}</p>{card.knowledge_document_id && <Sparkles className="h-3.5 w-3.5 text-emerald-300" />}</div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-400">{card.body}</p><p className="mt-2 text-[11px] text-zinc-600">{card.occurred_at ? new Date(card.occurred_at).toLocaleString() : ''}</p></div>{!card.knowledge_document_id && <button disabled={busy} onClick={() => promote(card)} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-400 hover:text-white">Promote</button>}</div></div>)}{!cards.length && <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-zinc-600">No context cards yet.</div>}</div>
      </section>
      <aside className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
        <h2 className="font-medium text-white">Add context</h2>
        <label className="mt-4 block text-xs text-zinc-500">Workspace</label><select value={cardDraft.workspace_id} onChange={(e) => setCardDraft({ ...cardDraft, workspace_id: e.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"><option value="">Global timeline</option>{workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.title}</option>)}</select>
        <label className="mt-4 block text-xs text-zinc-500">Type</label><select value={cardDraft.card_kind} onChange={(e) => setCardDraft({ ...cardDraft, card_kind: e.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white">{['note','task','event','progress','metric','link','person','place','insight'].map((kind) => <option key={kind} value={kind}>{kind}</option>)}</select>
        <label className="mt-4 block text-xs text-zinc-500">Title</label><input value={cardDraft.title} onChange={(e) => setCardDraft({ ...cardDraft, title: e.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" />
        <label className="mt-4 block text-xs text-zinc-500">Context</label><textarea value={cardDraft.body} onChange={(e) => setCardDraft({ ...cardDraft, body: e.target.value })} rows={9} className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" />
        <button disabled={busy} onClick={saveCard} className="mt-5 w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">Save context card</button>
      </aside>
    </div>}
  </>;
}
