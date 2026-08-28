import { useEffect, useMemo, useState } from 'react';
import { Archive, BookOpen, CheckSquare, FileText, Hash, Plus, RefreshCw, Search, Sparkles, Trash2 } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { deleteZenNote, listZenNotes, moveZenNote, promoteZenNoteToKnowledge, saveZenNote } from '@/lib/notes/zen-notes.functions';

const EMPTY = { id: null, title: '', body: '', note_kind: 'note', lifecycle: 'active', tags: [], pinned: false, knowledge_document_id: null };

function dateTitle(kind) {
  const now = new Date();
  if (kind === 'daily') return now.toISOString().slice(0, 10);
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = start.getUTCDay() || 7;
  start.setUTCDate(start.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(start.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((start - yearStart) / 86400000) + 1) / 7);
  return `${start.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function tagsFrom(body, explicit = []) {
  const inline = [...String(body).matchAll(/(?:^|\s)#([a-z0-9_-]{1,40})/gi)].map((m) => m[1].toLowerCase());
  return [...new Set([...explicit, ...inline])].slice(0, 30);
}

function taskStats(body) {
  const all = String(body).match(/^\s*[-*]\s+\[[ xX]\]\s+/gm) ?? [];
  const done = String(body).match(/^\s*[-*]\s+\[[xX]\]\s+/gm) ?? [];
  return { all: all.length, done: done.length };
}

export default function RecallNotes() {
  const [lifecycle, setLifecycle] = useState('active');
  const [query, setQuery] = useState('');
  const [notes, setNotes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function refresh() {
    setLoading(true); setError('');
    try {
      const result = await listZenNotes({ data: { lifecycle, query, limit: 300 } });
      setNotes(result?.notes ?? []);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load notes.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, [lifecycle]);

  const stats = useMemo(() => {
    let tasks = 0; let done = 0; const tags = new Set();
    for (const note of notes) { const s = taskStats(note.body); tasks += s.all; done += s.done; (note.tags ?? []).forEach((tag) => tags.add(tag)); }
    return { tasks, done, tags: tags.size };
  }, [notes]);

  function start(kind = 'note') {
    setSelected(null);
    setDraft({ ...EMPTY, title: kind === 'note' ? '' : dateTitle(kind), note_kind: kind });
  }

  function open(note) { setSelected(note.id); setDraft({ ...note }); }

  async function save() {
    if (!draft.title.trim()) return setError('Give the note a title.');
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await saveZenNote({ data: {
        id: draft.id ?? undefined,
        title: draft.title,
        body: draft.body,
        noteKind: draft.note_kind,
        lifecycle: draft.lifecycle,
        tags: tagsFrom(draft.body, draft.tags ?? []),
        pinned: Boolean(draft.pinned),
      } });
      setDraft(result.note); setSelected(result.note.id); setNotice('Note saved.'); await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save note.'); }
    finally { setBusy(false); }
  }

  async function move(target) {
    if (!draft.id) return;
    setBusy(true);
    try { await moveZenNote({ data: { id: draft.id, lifecycle: target } }); setDraft(EMPTY); setSelected(null); await refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not move note.'); }
    finally { setBusy(false); }
  }

  async function removeForever() {
    if (!draft.id) return;
    setBusy(true);
    try { await deleteZenNote({ data: { id: draft.id } }); setDraft(EMPTY); setSelected(null); await refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not delete note.'); }
    finally { setBusy(false); }
  }

  async function promote() {
    if (!draft.id) return setError('Save this note before promoting it to Knowledge.');
    setBusy(true); setError('');
    try {
      const result = await promoteZenNoteToKnowledge({ data: { id: draft.id } });
      setDraft((current) => ({ ...current, knowledge_document_id: result.documentId }));
      setNotice(`Indexed into Knowledge in ${result.chunks} chunk(s).`); await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not promote note.'); }
    finally { setBusy(false); }
  }

  const currentTasks = taskStats(draft.body);
  const currentTags = tagsFrom(draft.body, draft.tags ?? []);

  return <>
    <PageHeader eyebrow="Knowledge workspace" title="Recall Notes" description="Capture notes, tasks, ideas and daily or weekly context in one recall workspace. Promote finished notes into PalladiumAI Knowledge so agents can retrieve them through the existing vector-memory layer." action={<div className="flex flex-wrap gap-2"><button onClick={() => start('daily')} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300">Daily note</button><button onClick={() => start('weekly')} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300">Weekly note</button><button onClick={() => start('note')} className="flex items-center gap-1 rounded-xl bg-violet-600 px-3 py-2 text-xs font-medium text-white"><Plus className="h-3.5 w-3.5" />New note</button></div>} />
    {(error || notice) && <div className={`mb-4 rounded-xl border p-3 text-sm ${error ? 'border-red-400/20 bg-red-500/[.06] text-red-200' : 'border-emerald-400/20 bg-emerald-500/[.06] text-emerald-200'}`}>{error || notice}</div>}
    <div className="mb-4 grid gap-3 sm:grid-cols-3"><Mini icon={FileText} label="Visible notes" value={notes.length} /><Mini icon={CheckSquare} label="Tasks" value={`${stats.done}/${stats.tasks}`} /><Mini icon={Hash} label="Tags" value={stats.tags} /></div>
    <div className="grid min-h-[650px] gap-4 xl:grid-cols-[320px_1fr]">
      <aside className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
        <div className="flex gap-2">{['active','archived','trash'].map((item) => <button key={item} onClick={() => setLifecycle(item)} className={`rounded-lg px-2.5 py-1.5 text-xs ${lifecycle === item ? 'bg-violet-500/15 text-violet-200' : 'text-zinc-500 hover:bg-white/5'}`}>{item}</button>)}</div>
        <div className="mt-3 flex gap-2"><div className="relative flex-1"><Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-600" /><input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && refresh()} placeholder="Search Recall Notes" className="w-full rounded-xl border border-white/10 bg-black/20 py-2 pl-8 pr-2 text-xs text-white" /></div><button onClick={refresh} className="rounded-xl border border-white/10 px-2.5 text-zinc-500"><RefreshCw className="h-3.5 w-3.5" /></button></div>
        <div className="mt-3 space-y-2">{notes.map((note) => <button key={note.id} onClick={() => open(note)} className={`w-full rounded-xl border p-3 text-left ${selected === note.id ? 'border-violet-400/30 bg-violet-500/[.08]' : 'border-white/10 bg-black/15 hover:bg-white/[.04]'}`}><div className="flex items-center gap-2"><p className="min-w-0 flex-1 truncate text-sm text-white">{note.title}</p>{note.knowledge_document_id && <Sparkles className="h-3.5 w-3.5 text-emerald-300" />}</div><p className="mt-1 line-clamp-2 text-[11px] leading-4 text-zinc-500">{note.body || 'Empty note'}</p></button>)}{!loading && !notes.length && <p className="py-8 text-center text-xs text-zinc-600">No notes here.</p>}</div>
      </aside>
      <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
        <div className="flex flex-wrap items-center gap-2"><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Note title" className="min-w-[220px] flex-1 bg-transparent text-xl font-semibold text-white outline-none" /><span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase text-zinc-500">{draft.note_kind}</span>{draft.knowledge_document_id && <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[10px] text-emerald-200">in Knowledge</span>}</div>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-zinc-500"><span>{currentTasks.done}/{currentTasks.all} tasks</span>{currentTags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2"><textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={24} placeholder="# Start writing…\n\n- [ ] Tasks and #tags are detected automatically." className="min-h-[520px] resize-y rounded-xl border border-white/10 bg-black/25 p-4 font-mono text-sm leading-6 text-zinc-200 outline-none" /><div className="min-h-[520px] overflow-auto rounded-xl border border-white/10 bg-[#f6f4ed] p-6 text-sm leading-7 text-zinc-800"><pre className="whitespace-pre-wrap font-sans">{draft.body || 'Preview appears here as plain Markdown text. Finished notes can be promoted into PalladiumAI Knowledge for semantic agent retrieval.'}</pre></div></div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2"><div className="flex gap-2">{draft.id && lifecycle !== 'archived' && <button onClick={() => move('archived')} disabled={busy} className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-400"><Archive className="h-3.5 w-3.5" />Archive</button>}{draft.id && lifecycle !== 'trash' && <button onClick={() => move('trash')} disabled={busy} className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-400"><Trash2 className="h-3.5 w-3.5" />Trash</button>}{draft.id && lifecycle === 'trash' && <button onClick={removeForever} disabled={busy} className="rounded-lg border border-red-400/20 px-3 py-2 text-xs text-red-300">Delete forever</button>}</div><div className="flex gap-2"><button onClick={promote} disabled={busy || !draft.id || !draft.body.trim()} className="flex items-center gap-1 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100 disabled:opacity-40"><BookOpen className="h-3.5 w-3.5" />Promote to Knowledge</button><button onClick={save} disabled={busy || !draft.title.trim()} className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black disabled:opacity-40">Save note</button></div></div>
      </section>
    </div>
  </>;
}

function Mini({ icon: Icon, label, value }) { return <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><Icon className="h-4 w-4 text-violet-300" /><p className="mt-2 text-xl font-semibold text-white">{value}</p><p className="text-xs text-zinc-500">{label}</p></div>; }
