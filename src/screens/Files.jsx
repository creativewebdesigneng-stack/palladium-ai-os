import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { ExternalLink, FileText, HardDrive, Loader2, Search, ShieldCheck, Trash2, Upload } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { useWorkspace } from '@/hooks/use-workspace';
import { useToast } from '@/components/ui/use-toast';
import { friendlyMessage } from '@/lib/errors';
import { getDocumentUrl, listMemories, removeKnowledgeDocument } from '@/lib/memory/memory.functions';
import { uploadKnowledgeDocument } from '@/lib/memory/uploadKnowledge';

function formatBytes(value) {
  const bytes = Number(value ?? 0);
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Files() {
  const { session } = useWorkspace();
  const { toast } = useToast();
  const qc = useQueryClient();
  const listFn = useServerFn(listMemories);
  const urlFn = useServerFn(getDocumentUrl);
  const deleteFn = useServerFn(removeKnowledgeDocument);

  const [query, setQuery] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');

  const q = useQuery({
    queryKey: ['workspace-files'],
    queryFn: () => listFn({ data: { limit: 200 } }),
    enabled: session === 'yes',
    retry: false,
  });

  const documents = q.data?.documents ?? [];
  const uploaded = useMemo(() => documents.filter((doc) => Boolean(doc.storage_path)), [documents]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return documents;
    return documents.filter((doc) => [doc.title, doc.mime_type, doc.metadata?.source].some((value) => String(value ?? '').toLowerCase().includes(needle)));
  }, [documents, query]);
  const totalBytes = uploaded.reduce((sum, doc) => sum + Number(doc.size_bytes ?? 0), 0);

  const upload = useMutation({
    mutationFn: () => uploadKnowledgeDocument({ file, title, summary, scope: 'private', category: 'file' }),
    onSuccess: (res) => {
      toast({ title: 'File stored and indexed', description: `${res?.chunks ?? 0} searchable chunk(s) created in private knowledge storage.` });
      setShowUpload(false);
      setFile(null);
      setTitle('');
      setSummary('');
      qc.invalidateQueries({ queryKey: ['workspace-files'] });
      qc.invalidateQueries({ queryKey: ['knowledge-documents'] });
    },
    onError: (error) => toast({ title: 'Upload failed', description: friendlyMessage(error), variant: 'destructive' }),
  });

  const openFile = useMutation({
    mutationFn: (documentId) => urlFn({ data: { document_id: documentId } }),
    onSuccess: (res) => {
      if (res?.url && typeof window !== 'undefined') window.open(res.url, '_blank', 'noopener,noreferrer');
    },
    onError: (error) => toast({ title: 'Could not open file', description: friendlyMessage(error), variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: (documentId) => deleteFn({ data: { document_id: documentId } }),
    onSuccess: () => {
      toast({ title: 'Document deleted', description: 'Its private file, chunks and indexed vectors were removed.' });
      qc.invalidateQueries({ queryKey: ['workspace-files'] });
      qc.invalidateQueries({ queryKey: ['knowledge-documents'] });
    },
    onError: (error) => toast({ title: 'Delete failed', description: friendlyMessage(error), variant: 'destructive' }),
  });

  const headerAction = <button onClick={() => setShowUpload(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3.5 py-2 text-sm font-medium text-white"><Upload className="h-4 w-4" />Upload file</button>;

  if (session !== 'yes' || q.isLoading) {
    return (<><PageHeader eyebrow="Workspace" title="Files & Knowledge" description="Private source files used by your AI knowledge index." action={headerAction} />
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.03] p-6 text-sm text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" />Loading private files…</div></>);
  }

  if (q.error) {
    return (<><PageHeader eyebrow="Workspace" title="Files & Knowledge" description="Private source files used by your AI knowledge index." action={headerAction} />
      <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[.05] p-6 text-sm text-rose-200">{friendlyMessage(q.error)}</div></>);
  }

  return (
    <>
      <PageHeader eyebrow="Workspace" title="Files & Knowledge" description="Live private documents from PalladiumAI's knowledge storage. Files are opened only through short-lived signed URLs." action={headerAction} />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Metric icon={FileText} label="Indexed documents" value={documents.length} />
        <Metric icon={HardDrive} label="Stored source files" value={uploaded.length} />
        <Metric icon={ShieldCheck} label="Stored file size" value={formatBytes(totalBytes)} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search stored and indexed documents…" className="w-full rounded-xl border border-white/10 bg-black/30 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-400/40" />
        </div>
        <button onClick={() => setShowUpload(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-200 hover:bg-white/10"><Upload className="h-4 w-4" />Upload</button>
      </div>

      {visible.length ? (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[.02]">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-white/[.03] text-[10px] uppercase tracking-wide text-zinc-600"><tr><th className="px-3 py-2 font-medium">Document</th><th className="px-3 py-2 font-medium">Source</th><th className="px-3 py-2 font-medium">Size</th><th className="px-3 py-2 font-medium">Chunks</th><th className="px-3 py-2 font-medium">Index status</th><th className="px-3 py-2 font-medium">Created</th><th className="px-3 py-2 text-right font-medium">Actions</th></tr></thead>
            <tbody className="divide-y divide-white/5">
              {visible.map((doc) => (
                <tr key={doc.id} className="hover:bg-white/[.02]">
                  <td className="px-3 py-2.5"><div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-500/10 text-violet-300"><FileText className="h-3.5 w-3.5" /></span><div><p className="font-medium text-white">{doc.title || 'Untitled document'}</p><p className="text-[10px] text-zinc-600">{doc.mime_type || 'Pasted text'}</p></div></div></td>
                  <td className="px-3 py-2.5 text-zinc-400">{doc.storage_path ? String(doc.metadata?.source || 'Private upload') : 'Indexed text'}</td>
                  <td className="px-3 py-2.5 text-zinc-400">{doc.storage_path ? formatBytes(doc.size_bytes) : '—'}</td>
                  <td className="px-3 py-2.5 text-zinc-300">{doc.chunk_count ?? 0}</td>
                  <td className="px-3 py-2.5"><span className={`rounded-full border px-2 py-0.5 text-[10px] ${doc.status === 'ready' ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : doc.status === 'failed' ? 'border-rose-400/20 bg-rose-400/10 text-rose-300' : 'border-amber-400/20 bg-amber-400/10 text-amber-300'}`}>{doc.status || 'unknown'}</span></td>
                  <td className="px-3 py-2.5 text-zinc-500">{doc.created_at ? new Date(doc.created_at).toLocaleString('en-GB') : '—'}</td>
                  <td className="px-3 py-2.5"><div className="flex justify-end gap-1">{doc.storage_path ? <button onClick={() => openFile.mutate(doc.id)} disabled={openFile.isPending} title="Open private file" className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-zinc-400 hover:bg-white/5"><ExternalLink className="h-3.5 w-3.5" /></button> : null}<button onClick={() => remove.mutate(doc.id)} disabled={remove.isPending} title="Delete document" className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-zinc-500 hover:border-rose-400/30 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid place-items-center rounded-2xl border border-dashed border-white/10 bg-white/[.02] px-6 py-14 text-center"><HardDrive className="h-9 w-9 text-zinc-600" /><p className="mt-3 text-sm font-medium text-white">{documents.length ? 'No documents match that search' : 'No files or knowledge documents yet'}</p><p className="mt-1 max-w-lg text-xs text-zinc-500">Upload a supported file to store it privately and index its readable text for your agents. Pasted-only knowledge also appears here as an indexed document without a source file.</p>{!documents.length ? <button onClick={() => setShowUpload(true)} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-medium text-white"><Upload className="h-3.5 w-3.5" />Upload first file</button> : null}</div>
      )}

      {showUpload ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0d0f16] p-5 shadow-2xl">
            <div className="flex items-center gap-2"><Upload className="h-4 w-4 text-violet-300" /><h2 className="text-sm font-semibold text-white">Upload private knowledge file</h2></div>
            <p className="mt-1 text-[11px] text-zinc-500">The original file is stored in your private knowledge bucket. Readable text is extracted, chunked and indexed. Maximum file size is 25 MB.</p>
            <label className="mt-4 block text-[11px] text-zinc-400">File</label>
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-1 block w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-500/15 file:px-3 file:py-1.5 file:text-xs file:text-violet-200" />
            <label className="mt-3 block text-[11px] text-zinc-400">Title (optional)</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Defaults to the filename" className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none" />
            <label className="mt-3 block text-[11px] text-zinc-400">Additional trusted context (optional)</label>
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={4} placeholder="Add context if the file has limited extractable text." className="mt-1 w-full resize-y rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600" />
            <div className="mt-4 flex justify-end gap-2"><button onClick={() => { setShowUpload(false); setFile(null); }} disabled={upload.isPending} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300">Cancel</button><button onClick={() => upload.mutate()} disabled={upload.isPending || !file} className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50">{upload.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}Store & index</button></div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Metric({ icon: Icon, label, value }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="flex items-center gap-1.5 text-zinc-500"><Icon className="h-3.5 w-3.5" /><span className="text-[10px] uppercase tracking-wide">{label}</span></div><p className="mt-1 text-xl font-semibold text-white">{value}</p></div>;
}
