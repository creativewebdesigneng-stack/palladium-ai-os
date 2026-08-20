import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { FilePlus2, History, Loader2, Play, Save, Trash2 } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { friendlyMessage } from '@/lib/errors';
import { useSessionReady } from '@/lib/useSessionReady';
import { useToast } from '@/components/ui/use-toast';
import {
  deletePrompt,
  getPromptWorkspace,
  runSavedPrompt,
  savePrompt,
} from '@/lib/prompts/prompt-workspace.functions';

const EMPTY = { id: null, name: '', description: '', system_prompt: '', prompt_text: '' };

export default function Prompts() {
  const session = useSessionReady();
  const qc = useQueryClient();
  const { toast } = useToast();
  const getFn = useServerFn(getPromptWorkspace);
  const saveFn = useServerFn(savePrompt);
  const deleteFn = useServerFn(deletePrompt);
  const runFn = useServerFn(runSavedPrompt);

  const [draft, setDraft] = useState(EMPTY);
  const [runInput, setRunInput] = useState('');
  const [latestOutput, setLatestOutput] = useState('');

  const workspace = useQuery({
    queryKey: ['prompt-workspace'],
    queryFn: () => getFn({ data: {} }),
    enabled: session === 'yes',
    retry: false,
  });

  const prompts = workspace.data?.prompts ?? [];
  const versions = workspace.data?.versions ?? [];
  const runs = workspace.data?.runs ?? [];

  useEffect(() => {
    if (!draft.id && prompts.length > 0) {
      const first = prompts[0];
      setDraft({
        id: first.id,
        name: first.name ?? '',
        description: first.description ?? '',
        system_prompt: first.system_prompt ?? '',
        prompt_text: first.prompt_text ?? '',
      });
    }
  }, [prompts, draft.id]);

  const selectedPrompt = useMemo(
    () => prompts.find((prompt) => prompt.id === draft.id) ?? null,
    [prompts, draft.id],
  );
  const selectedRuns = useMemo(
    () => runs.filter((run) => run.prompt_id === draft.id).slice(0, 12),
    [runs, draft.id],
  );
  const selectedVersions = useMemo(
    () => versions.filter((version) => version.prompt_id === draft.id).slice(0, 12),
    [versions, draft.id],
  );

  const refresh = () => qc.invalidateQueries({ queryKey: ['prompt-workspace'] });

  const save = useMutation({
    mutationFn: () => saveFn({ data: draft }),
    onSuccess: async (row) => {
      setDraft({
        id: row.id,
        name: row.name ?? '',
        description: row.description ?? '',
        system_prompt: row.system_prompt ?? '',
        prompt_text: row.prompt_text ?? '',
      });
      toast({ title: draft.id ? 'Prompt updated' : 'Prompt saved', description: `Version ${row.version} is now live.` });
      await refresh();
    },
    onError: (error) => toast({ variant: 'destructive', title: 'Save failed', description: friendlyMessage(error) }),
  });

  const remove = useMutation({
    mutationFn: () => deleteFn({ data: { id: draft.id } }),
    onSuccess: async () => {
      setDraft(EMPTY);
      setLatestOutput('');
      setRunInput('');
      toast({ title: 'Prompt deleted' });
      await refresh();
    },
    onError: (error) => toast({ variant: 'destructive', title: 'Delete failed', description: friendlyMessage(error) }),
  });

  const run = useMutation({
    mutationFn: () => runFn({ data: { id: draft.id, input: runInput } }),
    onSuccess: async (result) => {
      setLatestOutput(result.output ?? '');
      toast({ title: 'Prompt completed', description: `${result.run?.provider ?? 'AI'} · ${result.run?.model ?? 'configured model'}` });
      await refresh();
    },
    onError: async (error) => {
      toast({ variant: 'destructive', title: 'Prompt run failed', description: friendlyMessage(error) });
      await refresh();
    },
  });

  const choosePrompt = (prompt) => {
    setDraft({
      id: prompt.id,
      name: prompt.name ?? '',
      description: prompt.description ?? '',
      system_prompt: prompt.system_prompt ?? '',
      prompt_text: prompt.prompt_text ?? '',
    });
    setRunInput('');
    setLatestOutput('');
  };

  if (session === 'no') {
    return <><PageHeader eyebrow="AI" title="Prompt Workspace" description="Save, version and run reusable prompts against the live PalladiumAI model runtime." /><StateCard text="Sign in to use Prompt Workspace." /></>;
  }

  if (workspace.isLoading) {
    return <><PageHeader eyebrow="AI" title="Prompt Workspace" description="Save, version and run reusable prompts against the live PalladiumAI model runtime." /><StateCard icon={Loader2} spin text="Loading your prompt library…" /></>;
  }

  if (workspace.isError) {
    return <><PageHeader eyebrow="AI" title="Prompt Workspace" description="Save, version and run reusable prompts against the live PalladiumAI model runtime." /><StateCard text={friendlyMessage(workspace.error)} /></>;
  }

  return (
    <>
      <PageHeader
        eyebrow="AI"
        title="Prompt Workspace"
        description="Saved prompts are private to your account, versioned on every save, and executed through the same entitlement, provider-failover, usage and audit controls as PalladiumAI Chat."
        action={
          <button
            onClick={() => { setDraft(EMPTY); setRunInput(''); setLatestOutput(''); }}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-400"
          >
            <FilePlus2 className="h-4 w-4" /> New prompt
          </button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_minmax(340px,0.8fr)]">
        <aside className="rounded-2xl border border-white/10 bg-white/[.03] p-3">
          <div className="mb-3 flex items-center justify-between px-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Library</p>
            <span className="text-[11px] text-zinc-600">{prompts.length}</span>
          </div>
          <div className="space-y-1.5">
            {prompts.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-4 text-xs leading-5 text-zinc-500">No saved prompts yet. Create your first reusable prompt.</p>}
            {prompts.map((prompt) => (
              <button
                key={prompt.id}
                onClick={() => choosePrompt(prompt)}
                className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${draft.id === prompt.id ? 'border-violet-400/30 bg-violet-500/10' : 'border-transparent hover:border-white/10 hover:bg-white/[.03]'}`}
              >
                <p className="truncate text-sm font-medium text-white">{prompt.name}</p>
                <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-zinc-500">{prompt.description || 'No description'}</p>
                <p className="mt-2 text-[10px] uppercase tracking-wide text-zinc-600">v{prompt.version}</p>
              </button>
            ))}
          </div>
        </aside>

        <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Editor</p>
              <h2 className="mt-1 text-lg font-semibold text-white">{draft.id ? 'Edit saved prompt' : 'Create prompt'}</h2>
            </div>
            {selectedPrompt && <span className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] text-zinc-400">Version {selectedPrompt.version}</span>}
          </div>

          <div className="mt-4 space-y-3">
            <Field label="Name">
              <input value={draft.name} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} maxLength={120} placeholder="Competitor brief" className="input" />
            </Field>
            <Field label="Description">
              <input value={draft.description} onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))} maxLength={1000} placeholder="What this prompt is for" className="input" />
            </Field>
            <Field label="System instructions" optional>
              <textarea value={draft.system_prompt} onChange={(e) => setDraft((prev) => ({ ...prev, system_prompt: e.target.value }))} rows={4} maxLength={8000} placeholder="Optional behaviour, role or output rules" className="input resize-y" />
            </Field>
            <Field label="Prompt">
              <textarea value={draft.prompt_text} onChange={(e) => setDraft((prev) => ({ ...prev, prompt_text: e.target.value }))} rows={9} maxLength={16000} placeholder="Write the reusable prompt here…" className="input resize-y" />
            </Field>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-[11px] text-zinc-600">Every save creates an immutable version snapshot.</div>
            <div className="flex gap-2">
              {draft.id && (
                <button onClick={() => remove.mutate()} disabled={remove.isPending || save.isPending || run.isPending} className="inline-flex items-center gap-2 rounded-xl border border-rose-400/20 px-3 py-2 text-xs font-medium text-rose-300 hover:bg-rose-500/10 disabled:opacity-40">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              )}
              <button onClick={() => save.mutate()} disabled={!draft.name.trim() || !draft.prompt_text.trim() || save.isPending || run.isPending} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-zinc-200 disabled:opacity-40">
                {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
              </button>
            </div>
          </div>

          {selectedVersions.length > 0 && (
            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="flex items-center gap-2 text-xs font-semibold text-zinc-300"><History className="h-3.5 w-3.5 text-violet-300" />Version history</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedVersions.map((version) => <span key={version.id} className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] text-zinc-500">v{version.version} · {new Date(version.created_at).toLocaleString('en-GB')}</span>)}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Run</p>
          <h2 className="mt-1 text-lg font-semibold text-white">Live model execution</h2>
          <p className="mt-1 text-xs leading-5 text-zinc-500">Optional input is appended to the saved prompt at run time. Runs count against your normal platform usage limits.</p>

          <textarea value={runInput} onChange={(e) => setRunInput(e.target.value)} rows={5} maxLength={8000} placeholder="Optional run-specific input…" className="input mt-4 resize-y" />
          <button onClick={() => run.mutate()} disabled={!draft.id || run.isPending || save.isPending} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-40">
            {run.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} {run.isPending ? 'Running…' : 'Run saved prompt'}
          </button>

          {(latestOutput || selectedRuns[0]?.output_text) && (
            <div className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-500/[.04] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-300">Latest output</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{latestOutput || selectedRuns[0]?.output_text}</p>
            </div>
          )}

          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="text-xs font-semibold text-zinc-300">Recent runs</p>
            <div className="mt-2 space-y-2">
              {selectedRuns.length === 0 && <p className="text-xs text-zinc-600">No runs for this prompt yet.</p>}
              {selectedRuns.map((item) => (
                <div key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[11px] font-medium ${item.status === 'succeeded' ? 'text-emerald-300' : item.status === 'failed' ? 'text-rose-300' : 'text-amber-300'}`}>{item.status}</span>
                    <span className="text-[10px] text-zinc-600">v{item.prompt_version} · {new Date(item.created_at).toLocaleString('en-GB')}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-500">{item.provider || '—'} · {item.model || '—'} · {Number(item.input_tokens || 0) + Number(item.output_tokens || 0)} tokens</p>
                  {item.error && <p className="mt-1 text-[11px] text-rose-300/80">{item.error}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function Field({ label, optional, children }) {
  return <label className="block"><span className="mb-1.5 block text-[11px] font-medium text-zinc-400">{label}{optional ? ' · optional' : ''}</span>{children}</label>;
}

function StateCard({ icon: Icon, spin, text }) {
  return <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.03] p-6 text-sm text-zinc-400">{Icon && <Icon className={`h-4 w-4 ${spin ? 'animate-spin' : ''}`} />}{text}</div>;
}
