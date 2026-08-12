import { useState } from 'react';
import { FileText, Trash2, ExternalLink, Loader2, Layers, Lock } from 'lucide-react';
import { getDocumentUrl, getDocumentChunks } from '@/lib/memory/memory.functions';

/**
 * Private document vault. Files live in a private bucket, so opening one mints a
 * short-lived signed link server-side — no document URL is ever public.
 */
export default function DocumentVault({ documents, onDelete, onError }) {
  const [busy, setBusy] = useState(null);
  const [chunks, setChunks] = useState({ id: null, rows: [] });

  const open = async (doc) => {
    setBusy(`open:${doc.id}`);
    try {
      const res = await getDocumentUrl({ data: { document_id: doc.id } });
      window.open(res.url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      onError?.(e);
    } finally {
      setBusy(null);
    }
  };

  const inspect = async (doc) => {
    if (chunks.id === doc.id) return setChunks({ id: null, rows: [] });
    setBusy(`chunks:${doc.id}`);
    try {
      const res = await getDocumentChunks({ data: { document_id: doc.id, limit: 12 } });
      setChunks({ id: doc.id, rows: res.chunks || [] });
    } catch (e) {
      onError?.(e);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Layers className="h-4 w-4 text-sky-400" />
        <h3 className="text-sm font-semibold text-white">Document knowledge</h3>
        <span className="ml-auto flex items-center gap-1 text-[10px] text-zinc-500">
          <Lock className="h-3 w-3" /> Private storage
        </span>
      </div>

      {!documents.length && (
        <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-zinc-500">
          No documents yet. Upload knowledge and it will be chunked, embedded and searchable by your agents.
        </p>
      )}

      <div className="space-y-2">
        {documents.map((doc) => (
          <div key={doc.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-start gap-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-500/15">
                <FileText className="h-4 w-4 text-sky-300" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-white">{doc.title}</p>
                <p className="mt-0.5 text-[10px] text-zinc-500">
                  {doc.chunk_count || 0} chunks · {doc.status || 'ready'}
                  {doc.size_bytes ? ` · ${Math.max(1, Math.round(doc.size_bytes / 1024))} KB` : ''}
                  {doc.storage_path ? '' : ' · text only'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => inspect(doc)}
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"
                  title="Preview indexed chunks"
                >
                  {busy === `chunks:${doc.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Layers className="h-3.5 w-3.5" />}
                </button>
                {doc.storage_path && (
                  <button
                    onClick={() => open(doc)}
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"
                    title="Open the original file"
                  >
                    {busy === `open:${doc.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                  </button>
                )}
                <button
                  onClick={() => onDelete(doc)}
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-500/10 hover:text-rose-300"
                  title="Delete document and its vectors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {chunks.id === doc.id && (
              <div className="mt-2.5 space-y-1.5 border-t border-white/5 pt-2.5">
                {chunks.rows.length === 0 && <p className="text-[10px] text-zinc-500">No chunks indexed.</p>}
                {chunks.rows.map((c) => (
                  <p key={c.id} className="rounded-lg bg-white/[.03] p-2 text-[10px] leading-relaxed text-zinc-400">
                    <span className="mr-1.5 text-zinc-600">#{c.chunk_index + 1}</span>
                    {String(c.content).slice(0, 320)}
                    {String(c.content).length > 320 ? '…' : ''}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
