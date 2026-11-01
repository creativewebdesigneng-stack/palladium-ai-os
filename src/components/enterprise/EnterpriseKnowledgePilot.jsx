import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { BookMarked, FileSearch, LockKeyhole, Loader2, ShieldCheck } from 'lucide-react';
import { previewPrivateKnowledgeEvidence } from '@/lib/enterprise/private-knowledge-evidence.functions';
import { friendlyMessage } from '@/lib/errors';

/**
 * Existing signed-in Knowledge workspace only: no public enterprise lead form,
 * cross-tenant selector, generated answers, or autonomous agent execution.
 */
export default function EnterpriseKnowledgePilot({ documents = [] }) {
  const previewFn = useServerFn(previewPrivateKnowledgeEvidence);
  const [question, setQuestion] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const available = useMemo(() => documents.filter(doc =>
    doc && doc.id && doc.org_id == null && doc.agent_id == null && doc.status === 'ready',
  ), [documents]);
  const preview = useMutation({
    mutationFn: data => previewFn({ data }),
  });

  const updateSelection = (id, checked) => {
    preview.reset();
    setSelectedIds(previous => checked ? [...previous, id].slice(0, 3) :
      previous.filter(selected => selected !== id));
  };
  const start = () => {
    if (!selectedIds.length || question.trim().length < 8 || question.trim().length > 300) return;
    preview.mutate({ question: question.trim(), documentIds: selectedIds });
  };

  return (
    <section aria-labelledby="enterprise-knowledge-title"
      className="mt-5 rounded-[24px] border border-amber-300/20 bg-[linear-gradient(140deg,rgba(50,38,16,.24),rgba(8,9,16,.95))] p-5 md:p-6">
      <header className="flex items-start gap-3">
        <span className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-2 text-amber-200">
          <FileSearch className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-amber-300">Enterprise pilot · read-only evidence</p>
          <h2 id="enterprise-knowledge-title" className="mt-1 text-lg font-semibold text-white">Private Knowledge Intelligence — source verification</h2>
          <p className="mt-2 max-w-3xl text-xs leading-6 text-zinc-400">
            Select one to three of your own ready, private documents and inspect bounded source excerpts from Blackstar's existing
            owner-scoped retrieval. No agent action, model answer, external sharing or new document permissions.
          </p>
        </div>
      </header>

      {!available.length ? (
        <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4 text-xs leading-5 text-zinc-400">
          No ready personal documents are available. Use “Add knowledge” above to index a private document before running a pilot.
        </div>
      ) : (
        <>
          <fieldset className="mt-5">
            <legend className="text-xs font-medium text-zinc-200">Choose authorised private sources (maximum three)</legend>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {available.slice(0, 20).map(doc => {
                const checked = selectedIds.includes(doc.id);
                return <label key={doc.id} className="flex min-w-0 items-start gap-2 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-zinc-200">
                  <input type="checkbox" className="mt-0.5 accent-amber-300"
                    disabled={!checked && selectedIds.length >= 3} checked={checked}
                    onChange={event => updateSelection(doc.id, event.target.checked)} />
                  <span className="min-w-0">
                    <span className="block break-words font-medium">{doc.title || 'Untitled document'}</span>
                    <span className="mt-0.5 block text-[10px] text-zinc-500">Ready · personal document</span>
                  </span>
                </label>;
              })}
            </div>
            {available.length > 20 ? <p className="mt-2 text-[11px] text-zinc-500">Showing the first 20 documents. This bounded pilot does not search every source in your account.</p> : null}
          </fieldset>
          <label className="mt-4 block text-xs font-medium text-zinc-200">Customer evaluation question
            <textarea rows={2} maxLength={300} value={question}
              onChange={event => { preview.reset(); setQuestion(event.target.value); }}
              placeholder="For example: Which conditions appear in the approved returns policy?"
              className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-amber-300/30" />
          </label>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-[11px] text-zinc-500"><LockKeyhole className="h-3.5 w-3.5" />{selectedIds.length} private source(s) selected. No query history is stored by this pilot.</p>
            <button type="button" onClick={start} disabled={preview.isPending || !selectedIds.length || question.trim().length < 8}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-300/25 bg-amber-300/15 px-4 py-2.5 text-xs font-semibold text-amber-100 disabled:opacity-40">
              {preview.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookMarked className="h-4 w-4" />}
              Retrieve source evidence
            </button>
          </div>
        </>
      )}

      {preview.error && <p role="alert" className="mt-4 rounded-xl border border-rose-300/20 p-3 text-xs text-rose-200">{friendlyMessage(preview.error)}</p>}

      {preview.isSuccess && preview.data && (
        <div className="mt-5 space-y-3" aria-live="polite">
          <div className="rounded-xl border border-white/10 bg-black/25 p-4">
            <p className="flex items-center gap-2 text-xs font-semibold text-white">
              <ShieldCheck className="h-4 w-4 text-amber-200" />
              {preview.data.status === 'retrieved_excerpts' ? 'Retrieved excerpts (not an answer)' : 'No authorised excerpts returned'}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              {preview.data.matchedDocumentCount} of {preview.data.requestedDocumentCount} selected source(s) represented in the returned excerpts.
              This is not a recall, accuracy or compliance score.
            </p>
            <p className="mt-2 text-[11px] leading-5 text-zinc-500">{preview.data.limitation}</p>
          </div>
          {preview.data.excerpts.map((item, index) => (
            <article key={item.citation} className="rounded-xl border border-white/10 bg-black/25 p-4">
              <p className="text-xs font-semibold text-white">{index + 1}. {item.documentTitle}</p>
              <p className="mt-1 break-all font-mono text-[10px] text-amber-200">Citation: {item.citation}</p>
              <p className="mt-3 whitespace-pre-wrap break-words text-xs leading-6 text-zinc-300">{item.excerpt}</p>
              {item.similarity !== null && <p className="mt-2 text-[10px] text-zinc-500">Retrieval similarity {Math.round(item.similarity * 100)}% (not source accuracy)</p>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
