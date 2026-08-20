import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { FilePlus2, Loader2, Save, Sparkles, Trash2 } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import DocumentsToolbar from '@/components/documents/DocumentsToolbar';
import DocumentTypes from '@/components/documents/DocumentTypes';
import AIDocumentsPanel from '@/components/documents/AIDocumentsPanel';
import { DocumentsGrid, StarterPromptsView } from '@/components/documents/DocumentsViews';
import { TYPES } from '@/components/documents/documentsConfig';
import { useSessionReady } from '@/lib/useSessionReady';
import { friendlyMessage } from '@/lib/errors';
import { useToast } from '@/components/ui/use-toast';
import {
  deleteDocument,
  generateDocument,
  listDocuments,
  saveDocument,
  transformDocument,
} from '@/lib/documents/documents.functions';

const EMPTY = { id: null, title: '', doc_type: 'document', format: 'md', body: '' };

function toDraft(document) {
  if (!document) return EMPTY;
  return {
    id: document.id,
    title: document.title ?? '',
    doc_type: document.doc_type ?? 'document',
    format: document.format ?? 'md',
    body: document.body ?? '',
  };
}

export default function Documents() {
  const session = useSessionReady();
  const qc = useQueryClient();
  const { toast } = useToast();
  const listFn = useServerFn(listDocuments);
  const saveFn = useServerFn(saveDocument);
  const deleteFn = useServerFn(deleteDocument);
  const generateFn = useServerFn(generateDocument);
  const transformFn = useServerFn(transformDocument);

  const [view, setView] = useState('recent');
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(EMPTY);
  const [generationPrompt, setGenerationPrompt] = useState('');
  const [generationType, setGenerationType] = useState('document');
  const [translationLanguage, setTranslationLanguage] = useState('English');
  const [runningTransform, setRunningTransform] = useState(null);

  const workspace = useQuery({
    queryKey: ['documents-workspace'],
    queryFn: () => listFn({ data: {} }),
    enabled: session === 'yes',
    retry: false,
  });

  const documents = workspace.data?.documents ?? [];
  const metrics = workspace.data?.metrics ?? { total: 0, aiGenerated: 0, derived: 0, updatedThisWeek: 0, words: 0 };
  const selectedDocument = useMemo(() => documents.find((document) => document.id === selectedId) ?? null, [documents, selectedId]);
  const visibleDocuments = view === 'ai' ? documents.filter((document) => String(document.source || '').startsWith('ai_')) : documents;

  useEffect(() => {
    if (selectedId && selectedDocument) setDraft(toDraft(selectedDocument));
  }, [selectedId, selectedDocument]);

  useEffect(() => {
    if (!selectedId && draft.id === null && documents.length > 0) {
      setSelectedId(documents[0].id);
      setDraft(toDraft(documents[0]));
    }
  }, [documents, selectedId, draft.id]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['documents-workspace'] });

  const save = useMutation({
    mutationFn: () => saveFn({ data: draft }),
    onSuccess: async (row) => {
      setSelectedId(row.id);
      setDraft(toDraft(row));
      toast({ title: draft.id ? 'Document updated' : 'Document saved' });
      await refresh();
    },
    onError: (error) => toast({ variant: 'destructive', title: 'Save failed', description: friendlyMessage(error) }),
  });

  const remove = useMutation({
    mutationFn: () => deleteFn({ data: { id: draft.id } }),
    onSuccess: async () => {
      setSelectedId(null);
      setDraft(EMPTY);
      toast({ title: 'Document deleted' });
      await refresh();
    },
    onError: (error) => toast({ variant: 'destructive', title: 'Delete failed', description: friendlyMessage(error) }),
  });

  const generate = useMutation({
    mutationFn: () => generateFn({ data: { prompt: generationPrompt, title: '', doc_type: generationType, format: 'md' } }),
    onSuccess: async (row) => {
      setSelectedId(row.id);
      setDraft(toDraft(row));
      setGenerationPrompt('');
      setView('recent');
      toast({ title: 'Document generated', description: `${row.provider ?? 'AI'} · ${row.model ?? 'configured model'}` });
      await refresh();
    },
    onError: (error) => toast({ variant: 'destructive', title: 'Generation failed', description: friendlyMessage(error) }),
  });

  const transform = useMutation({
    mutationFn: ({ action }) => transformFn({ data: { id: selectedId, action, language: action === 'translate' ? translationLanguage : '' } }),
    onMutate: ({ action }) => setRunningTransform(action),
    onSuccess: async (row) => {
      setSelectedId(row.id);
      setDraft(toDraft(row));
      setView('recent');
      toast({ title: 'AI document action completed', description: `${row.provider ?? 'AI'} · ${row.model ?? 'configured model'}` });
      await refresh();
    },
    onError: (error) => toast({ variant: 'destructive', title: 'AI action failed', description: friendlyMessage(error) }),
    onSettled: () => setRunningTransform(null),
  });

  const beginNew = (type = 'document') => {
    setSelectedId(null);
    setDraft({ ...EMPTY, doc_type: type, title: `New ${TYPES.find((item) => item.id === type)?.label ?? 'Document'}` });
    setView('recent');
  };

  const chooseDocument = (document) => {
    setSelectedId(document.id);
    setDraft(toDraft(document));
  };

  const useStarter = (starter) => {
    setGenerationType(starter.doc_type);
    setGenerationPrompt(starter.prompt);
    setView('recent');
  };

  if (session === 'checking') {
    return <div className="grid min-h-[45vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-violet-300" /></div>;
  }

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Documents & Reports"
        description="Create, save and transform real documents in your private workspace. AI actions run through your configured PalladiumAI model provider."
        action={<button onClick={() => beginNew('document')} className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-xs text-zinc-200 hover:bg-white/[.07]"><FilePlus2 className="h-3.5 w-3.5" />New document</button>}
      />

      {workspace.error && (
        <div className="mb-4 rounded-xl border border-rose-400/20 bg-rose-400/[.06] px-4 py-3 text-xs text-rose-200">
          Documents could not be loaded: {friendlyMessage(workspace.error)}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Saved documents', metrics.total],
          ['AI generated', metrics.aiGenerated],
          ['Updated this week', metrics.updatedThisWeek],
          ['Total words', Number(metrics.words || 0).toLocaleString()],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/[.03] px-4 py-3">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
            <p className="mt-1 text-base font-semibold text-white">{value}</p>
            <p className="text-[10px] text-zinc-500">Persisted workspace data</p>
          </div>
        ))}
      </div>

      <div className="mt-4"><DocumentTypes onCreate={beginNew} /></div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <DocumentsToolbar view={view} setView={setView} onGenerate={() => document.getElementById('document-ai-generator')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} />

          {workspace.isLoading ? (
            <div className="grid min-h-48 place-items-center rounded-2xl border border-white/10 bg-white/[.02]"><Loader2 className="h-5 w-5 animate-spin text-violet-300" /></div>
          ) : view === 'starters' ? (
            <StarterPromptsView onUse={useStarter} />
          ) : (
            <DocumentsGrid
              documents={visibleDocuments}
              selectedId={selectedId}
              onOpen={chooseDocument}
              emptyText={view === 'ai' ? 'No AI-generated documents yet.' : 'No saved documents yet. Create one above or generate one with AI.'}
            />
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-white">{draft.id ? 'Document editor' : 'New document'}</h3>
              <p className="text-[11px] text-zinc-500">Changes are saved to your private workspace only when you press Save.</p>
            </div>
            {draft.id && <button onClick={() => remove.mutate()} disabled={remove.isPending} className="rounded-lg border border-rose-400/20 p-2 text-rose-300 hover:bg-rose-400/10 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>}
          </div>
          <div className="space-y-3">
            <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Document title" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-violet-400/50" />
            <div className="grid grid-cols-2 gap-2">
              <select value={draft.doc_type} onChange={(event) => setDraft((current) => ({ ...current, doc_type: event.target.value }))} className="rounded-xl border border-white/10 bg-[#11131a] px-3 py-2 text-xs text-zinc-200 outline-none">
                {TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
              </select>
              <select value={draft.format} onChange={(event) => setDraft((current) => ({ ...current, format: event.target.value }))} className="rounded-xl border border-white/10 bg-[#11131a] px-3 py-2 text-xs text-zinc-200 outline-none">
                <option value="md">Markdown</option><option value="pdf">PDF</option><option value="docx">DOCX</option><option value="pptx">PPTX</option><option value="csv">CSV</option>
              </select>
            </div>
            <textarea value={draft.body} onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))} placeholder="Write your document here…" rows={18} className="w-full resize-y rounded-xl border border-white/10 bg-black/20 px-3 py-3 font-mono text-xs leading-5 text-zinc-200 outline-none focus:border-violet-400/50" />
            <button onClick={() => save.mutate()} disabled={save.isPending || !draft.title.trim()} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-50">
              {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}Save document
            </button>
          </div>
        </div>
      </div>

      <div id="document-ai-generator" className="mt-4 rounded-2xl border border-violet-400/20 bg-violet-500/[.04] p-4">
        <div className="mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-300" /><div><h3 className="text-sm font-semibold text-white">AI document generator</h3><p className="text-[11px] text-zinc-500">Generated content is saved only after the model returns successfully.</p></div></div>
        <div className="grid gap-2 md:grid-cols-[180px_minmax(0,1fr)_auto]">
          <select value={generationType} onChange={(event) => setGenerationType(event.target.value)} className="rounded-xl border border-white/10 bg-[#11131a] px-3 py-2 text-xs text-zinc-200 outline-none">
            {TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
          </select>
          <textarea value={generationPrompt} onChange={(event) => setGenerationPrompt(event.target.value)} rows={3} placeholder="Describe the document you want AI to create…" className="resize-none rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-violet-400/50" />
          <button onClick={() => generate.mutate()} disabled={generate.isPending || generationPrompt.trim().length < 3} className="flex min-w-32 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-50">
            {generate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}Generate
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex max-w-xs items-center gap-2">
          <label className="text-[10px] uppercase tracking-wide text-zinc-500">Translate target</label>
          <input value={translationLanguage} onChange={(event) => setTranslationLanguage(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-zinc-200 outline-none" />
        </div>
        <AIDocumentsPanel onRun={(action) => transform.mutate({ action })} running={runningTransform} disabled={!selectedId || transform.isPending} />
      </div>
    </>
  );
}