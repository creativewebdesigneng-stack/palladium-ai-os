import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { BookOpen, FileText, Loader2, Plus, Search, Trash2, Upload, Database, Sparkles } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { useWorkspace } from '@/hooks/use-workspace';
import { useToast } from '@/components/ui/use-toast';
import { friendlyMessage } from '@/lib/errors';
import {
  listMemories,
  removeKnowledgeDocument,
  searchMemories,
} from '@/lib/memory/memory.functions';
import { uploadKnowledgeDocument } from '@/lib/memory/uploadKnowledge';

function formatBytes(value) {
  const bytes = Number(value ?? 0);
  if (!bytes) return 'Text only';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Knowledge() {
  const { session } = useWorkspace();
  const { toast } = useToast();
  const qc = useQueryClient();
  const listFn = useServerFn(listMemories);
  const deleteFn = useServerFn(removeKnowledgeDocument);
  const searchFn = useServerFn(searchMemories);

  const [filter, setFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [file, setFile] = useState(null);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const q = useQuery({
    queryKey: ['knowledge-documents'],
    queryFn: () => listFn({ data: { limit: 200 } }),
    enabled: session === 'yes',
    retry: false,
  });

  const documents = q.data?.documents ?? [];
  const filtered = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return documents;
    return documents.filter((doc) =>
      [doc.title, doc.source, doc.mime_type].some((value) => String(value ?? '').toLowerCase().includes(needle)),
    );
  }, [documents, filter]);

  const upload = useMutation({
    mutationFn: () => uploadKnowledgeDocument({
      file,
      title,
      summary,
      scope: 'private',
      category: 'knowledge',
    }),
    onSuccess: (res) => {
      toast({ title: 'Knowledge indexed', description: `${res?.chunks ?? 0} searchable chunk(s) created.` });
      setShowAdd(false);
      setTitle('');
      setSummary('');
      setFile(null);
      qc.invalidateQueries({ queryKey: ['knowledge-documents'] });
    },
    onError: (error) => toast({ title: 'Could not index knowledge', description: friendlyMessage(error), variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: (id) => deleteFn({ data: { document_id: id } }),
    onSuccess: () => {
      toast({ title: 'Knowledge document removed' });
      qc.invalidateQueries({ queryKey: ['knowledge-documents'] });
    },
    onError: (error) => toast({ title: 'Could not remove document', description: friendlyMessage(error), variant: 'destructive' }),
  });

  const semantic = useMutation({
    mutationFn: (query) => searchFn({ data: { query, limit: 10 } }),
    onSuccess: (res) => setSearchResults(res?.results ?? []),
    onError: (error) => toast({ title: 'Search failed', description: friendlyMessage(error), variant: 'destructive' }),
  });

  const runSearch = () => {
    const value = search.trim();
    if (!value) return;
    semantic.mutate(value);
  };

  return (
    <>
      <PageHeader
        eyebrow="Cognition"
        title="Knowledge Management"
        description="Private documents indexed into the same memory and vector-search layer your agents use at runtime."
        action={
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300">{documents.length} indexed document{documents.length === 1 ? '' : 's'}</span>
            <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500"><Plus className="h-3.5 w-3.5" />Add knowledge</button>
          </div>
        }
      />

      {session !== 'yes' ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-8 text-center text-sm text-zinc-500">Sign in to access your private knowledge index.</div>
      ) : q.isLoading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.03] p-6 text-sm text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" />Loading indexed knowledge…</div>
      ) : q.error ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[.05] p-6 text-sm text-rose-200">{friendlyMessage(q.error)}</div>
      ) : (
        <>
          <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter your indexed documents…" className="w-full rounded-xl border border-white/10 bg-black/30 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-400/40" />
            </div>
            <button onClick={() => setShowAdd(true)} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-200 hover:bg-white/10"><Upload className="h-4 w-4" />Upload or paste</button>
          </div>

          {filtered.length ? (
            <div className="mb-8 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {filtered.map((doc) => (
                <article key={doc.id} className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-300"><FileText className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{doc.title || 'Untitled document'}</p>
                      <p className="mt-0.5 truncate text-[11px] text-zinc-500">{doc.source || doc.mime_type || 'Pasted text'}</p>
                    </div>
                    <button onClick={() => remove.mutate(doc.id)} disabled={remove.isPending} title="Remove document" className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-zinc-500 hover:border-rose-400/30 hover:text-rose-300 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <Mini label="Chunks" value={String(doc.chunk_count ?? 0)} />
                    <Mini label="Size" value={formatBytes(doc.size_bytes)} />
                    <Mini label="Scope" value={String(doc.scope ?? 'private')} />
                  </div>
                  <p className="mt-3 text-[10px] text-zinc-600">Indexed {doc.created_at ? new Date(doc.created_at).toLocaleString('en-GB') : '—'}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="mb-8 grid place-items-center rounded-2xl border border-dashed border-white/10 bg-white/[.02] px-6 py-14 text-center">
              <BookOpen className="h-9 w-9 text-zinc-600" />
              <p className="mt-3 text-sm font-medium text-white">{documents.length ? 'No documents match that filter' : 'No knowledge indexed yet'}</p>
              <p className="mt-1 max-w-md text-xs text-zinc-500">{documents.length ? 'Change the filter to see your indexed documents.' : 'Upload a supported document or paste trusted source text. PalladiumAI will chunk and index it for agent retrieval.'}</p>
              {!documents.length ? <button onClick={() => setShowAdd(true)} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-medium text-white"><Plus className="h-3.5 w-3.5" />Add first document</button> : null}
            </div>
          )}

          <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
            <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-300" /><h2 className="text-sm font-semibold text-white">Semantic knowledge search</h2></div>
            <p className="mt-1 text-[11px] text-zinc-500">Uses the live vector index with keyword fallback. These are the same knowledge extracts available to agents.</p>
            <div className="mt-3 flex gap-2">
              <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); }} placeholder="What does our knowledge say about…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-400/40" />
              <button onClick={runSearch} disabled={semantic.isPending || !search.trim()} className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">{semantic.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}Search</button>
            </div>

            {searchResults.length ? (
              <div className="mt-4 space-y-2">
                {searchResults.map((hit, index) => (
                  <div key={`${hit.kind}-${hit.id}-${index}`} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-zinc-500"><Database className="h-3 w-3" />{hit.kind === 'document' ? 'Document extract' : hit.memory_type || 'Memory'}{Number(hit.similarity) > 0 ? <span className="ml-auto text-violet-300">{Math.round(Number(hit.similarity) * 100)}% match</span> : null}</div>
                    {hit.title ? <p className="mt-1 text-xs font-semibold text-white">{hit.title}</p> : null}
                    <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-zinc-300">{String(hit.content ?? '').slice(0, 1200)}</p>
                  </div>
                ))}
              </div>
            ) : semantic.isSuccess ? <p className="mt-4 text-xs text-zinc-500">No matching knowledge was found.</p> : null}
          </section>
        </>
      )}

      {showAdd ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0d0f16] p-5 shadow-2xl">
            <div className="flex items-center gap-2"><Upload className="h-4 w-4 text-violet-300" /><h2 className="text-sm font-semibold text-white">Add knowledge</h2></div>
            <p className="mt-1 text-[11px] text-zinc-500">Upload a file (up to 25 MB) or paste a trusted summary/text. The source is stored privately and indexed into searchable chunks.</p>
            <label className="mt-4 block text-[11px] text-zinc-400">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Customer support policy" className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none" />
            <label className="mt-3 block text-[11px] text-zinc-400">File (optional)</label>
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-1 block w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-500/15 file:px-3 file:py-1.5 file:text-xs file:text-violet-200" />
            <label className="mt-3 block text-[11px] text-zinc-400">Text or summary</label>
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={7} placeholder="Paste knowledge here. If you also upload a file, this text is indexed alongside the extracted document text." className="mt-1 w-full resize-y rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600" />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => { setShowAdd(false); setFile(null); }} disabled={upload.isPending} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300">Cancel</button>
              <button onClick={() => upload.mutate()} disabled={upload.isPending || (!file && !summary.trim())} className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50">{upload.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}Index knowledge</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Mini({ label, value }) {
  return <div className="rounded-lg bg-black/25 px-2 py-2"><p className="text-xs font-medium text-zinc-200">{value}</p><p className="mt-0.5 text-[9px] uppercase tracking-wide text-zinc-600">{label}</p></div>;
}
