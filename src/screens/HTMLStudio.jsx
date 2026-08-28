import { useEffect, useMemo, useState } from 'react';
import { Code2, Download, FileText, Plus, RefreshCw, Sparkles } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { createHtmlFromZenNote, listHtmlStudioDocuments, saveHtmlStudioDocument } from '@/lib/html-studio/html-studio.functions';
import { listZenNotes } from '@/lib/notes/zen-notes.functions';

const EMPTY = { id: null, title: '', source_kind: 'markdown', source_text: '', html: '', surface: 'document', status: 'draft', source_note_id: null };
const SURFACES = ['document','report','poster','deck','social','prototype','resume','frame'];
const SOURCE_KINDS = ['text','markdown','csv','json','sql','file'];

function downloadHtml(doc) {
  const blob = new Blob([doc.html || '<!doctype html><html><body></body></html>'], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${(doc.title || 'palladium-html').replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()}.html`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function HTMLStudio() {
  const [documents, setDocuments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [draft, setDraft] = useState(EMPTY);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function refresh() {
    setLoading(true); setError('');
    try {
      const [docsResult, notesResult] = await Promise.all([
        listHtmlStudioDocuments({ data: { limit: 150 } }),
        listZenNotes({ data: { lifecycle: 'active', limit: 200 } }).catch(() => ({ notes: [] })),
      ]);
      setDocuments(docsResult?.documents ?? []);
      setNotes(notesResult?.notes ?? []);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load HTML Studio.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);

  const readyCount = useMemo(() => documents.filter((doc) => doc.status === 'ready').length, [documents]);

  function open(doc) { setSelected(doc.id); setDraft({ ...doc }); }
  function createNew() { setSelected(null); setDraft({ ...EMPTY }); }

  async function importNote(noteId) {
    if (!noteId) return;
    setBusy(true); setError('');
    try {
      const result = await createHtmlFromZenNote({ data: { noteId, surface: draft.surface || 'document' } });
      setDraft(result.document); setSelected(result.document.id); setNotice('Zen Note imported as HTML Studio source. Grant an agent the html_studio tool to generate or refine the final HTML, or edit it here.'); await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not import note.'); }
    finally { setBusy(false); }
  }

  async function save() {
    if (!draft.title.trim()) return setError('Give the artifact a title.');
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await saveHtmlStudioDocument({ data: {
        id: draft.id ?? undefined,
        title: draft.title,
        sourceKind: draft.source_kind,
        sourceText: draft.source_text,
        html: draft.html,
        surface: draft.surface,
        status: draft.status,
        sourceNoteId: draft.source_note_id ?? null,
      } });
      setDraft(result.document); setSelected(result.document.id); setNotice('HTML artifact saved.'); await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save HTML artifact.'); }
    finally { setBusy(false); }
  }

  return <>
    <PageHeader eyebrow="Creator workspace" title="HTML Studio" description="Turn source material into standalone, ship-ready HTML artifacts. PalladiumAI agents can use the bounded html_studio tool to write the final HTML; the operator keeps a live sandboxed preview and export control." action={<div className="flex gap-2"><button onClick={refresh} className="flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300"><RefreshCw className="h-3.5 w-3.5" />Refresh</button><button onClick={createNew} className="flex items-center gap-1 rounded-xl bg-violet-600 px-3 py-2 text-xs text-white"><Plus className="h-3.5 w-3.5" />New artifact</button></div>} />
    {(error || notice) && <div className={`mb-4 rounded-xl border p-3 text-sm ${error ? 'border-red-400/20 bg-red-500/[.06] text-red-200' : 'border-emerald-400/20 bg-emerald-500/[.06] text-emerald-200'}`}>{error || notice}</div>}
    <div className="mb-4 grid gap-3 sm:grid-cols-3"><Metric icon={FileText} label="Artifacts" value={documents.length} /><Metric icon={Sparkles} label="Ready" value={readyCount} /><Metric icon={Code2} label="Surface" value={draft.surface || 'document'} /></div>
    <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
      <aside className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><p className="text-xs font-semibold text-white">Artifact library</p><div className="mt-3 space-y-2">{documents.map((doc) => <button key={doc.id} onClick={() => open(doc)} className={`w-full rounded-xl border p-3 text-left ${selected === doc.id ? 'border-violet-400/30 bg-violet-500/[.08]' : 'border-white/10 bg-black/15 hover:bg-white/[.04]'}`}><p className="truncate text-sm text-white">{doc.title}</p><p className="mt-1 text-[11px] text-zinc-500">{doc.surface} · {doc.status}</p></button>)}{!loading && !documents.length && <p className="py-8 text-center text-xs text-zinc-600">No HTML artifacts yet.</p>}</div></aside>
      <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]"><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Artifact title" className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" /><select value={draft.surface} onChange={(e) => setDraft({ ...draft, surface: e.target.value })} className="rounded-xl border border-white/10 bg-[#111218] px-3 py-2 text-xs text-zinc-300">{SURFACES.map((item) => <option key={item}>{item}</option>)}</select><select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} className="rounded-xl border border-white/10 bg-[#111218] px-3 py-2 text-xs text-zinc-300"><option>draft</option><option>ready</option><option>archived</option></select></div>
        <div className="mt-3 grid gap-3 md:grid-cols-[180px_1fr]"><select value={draft.source_kind} onChange={(e) => setDraft({ ...draft, source_kind: e.target.value })} className="rounded-xl border border-white/10 bg-[#111218] px-3 py-2 text-xs text-zinc-300">{SOURCE_KINDS.map((item) => <option key={item}>{item}</option>)}{draft.source_kind === 'note' && <option>note</option>}</select><select defaultValue="" onChange={(e) => { void importNote(e.target.value); e.target.value = ''; }} className="rounded-xl border border-white/10 bg-[#111218] px-3 py-2 text-xs text-zinc-300"><option value="">Import an active Zen Note…</option>{notes.map((note) => <option key={note.id} value={note.id}>{note.title}</option>)}</select></div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2"><div><p className="mb-2 text-xs font-semibold text-zinc-300">Source material</p><textarea value={draft.source_text} onChange={(e) => setDraft({ ...draft, source_text: e.target.value })} rows={13} placeholder="Paste Markdown, CSV, JSON, SQL or raw text…" className="w-full resize-y rounded-xl border border-white/10 bg-black/25 p-4 font-mono text-xs leading-5 text-zinc-200 outline-none" /><p className="mb-2 mt-4 text-xs font-semibold text-zinc-300">Final HTML</p><textarea value={draft.html} onChange={(e) => setDraft({ ...draft, html: e.target.value })} rows={16} placeholder="An enabled PalladiumAI agent can populate this using html_studio, or you can edit the HTML directly." className="w-full resize-y rounded-xl border border-white/10 bg-black/25 p-4 font-mono text-xs leading-5 text-zinc-200 outline-none" /></div><div><div className="mb-2 flex items-center justify-between"><p className="text-xs font-semibold text-zinc-300">Sandboxed preview</p><span className="text-[10px] text-zinc-600">scripts disabled</span></div><iframe title="HTML Studio preview" sandbox="" srcDoc={draft.html || '<!doctype html><html><body style="font-family:system-ui;padding:32px;color:#555"><h2>HTML preview</h2><p>Generated or edited HTML will render here in a script-disabled sandbox.</p></body></html>'} className="min-h-[700px] w-full rounded-xl border border-white/10 bg-white" /></div></div>
        <div className="mt-4 flex flex-wrap justify-end gap-2"><button onClick={() => downloadHtml(draft)} disabled={!draft.html} className="flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300 disabled:opacity-40"><Download className="h-3.5 w-3.5" />Download .html</button><button onClick={save} disabled={busy || !draft.title.trim()} className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black disabled:opacity-40">Save artifact</button></div>
      </section>
    </div>
  </>;
}

function Metric({ icon: Icon, label, value }) { return <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><Icon className="h-4 w-4 text-violet-300" /><p className="mt-2 text-xl font-semibold text-white">{value}</p><p className="text-xs text-zinc-500">{label}</p></div>; }
