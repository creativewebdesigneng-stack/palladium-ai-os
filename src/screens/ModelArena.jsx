import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useSearchParams } from 'react-router-dom';
import { BarChart3, Bot, FlaskConical, Gauge, Loader2, Plus, Scale, Sparkles, Trash2, Trophy } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { useWorkspace } from '@/hooks/use-workspace';
import { friendlyMessage } from '@/lib/errors';
import { getModelRuntimeOverview } from '@/lib/runtime/model-management.functions';
import { astraEvaluationContestants, parseAstraEvaluationHandoff } from '@/lib/evals/astra-evaluation-handoff';
import { getModelEvalRun, listModelEvalRuns, runModelArena } from '@/lib/evals/model-arena.functions';

const DEFAULT_CONTESTANTS = [
  { provider: 'openai', model: 'gpt-5-mini', label: 'Candidate A' },
  { provider: 'deepseek', model: 'deepseek-chat', label: 'Candidate B' },
];
const PROVIDERS = ['openai', 'anthropic', 'groq', 'deepseek', 'lovable', 'compatible'];

export default function ModelArena() {
  const { session } = useWorkspace();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const astraHandoff = useMemo(() => parseAstraEvaluationHandoff(searchParams), [searchParams]);
  const overviewFn = useServerFn(getModelRuntimeOverview);
  const listFn = useServerFn(listModelEvalRuns);
  const getFn = useServerFn(getModelEvalRun);
  const runFn = useServerFn(runModelArena);
  const [name, setName] = useState(() => astraHandoff?.runName ?? 'Model comparison');
  const [prompt, setPrompt] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [criteria, setCriteria] = useState(() => astraHandoff?.criteria ?? 'correctness, helpfulness, clarity');
  const [contestants, setContestants] = useState(() => astraHandoff ? astraEvaluationContestants(astraHandoff) : DEFAULT_CONTESTANTS);
  const [judge, setJudge] = useState({ provider: 'openai', model: 'gpt-5-mini', label: 'Judge' });
  const [selectedRunId, setSelectedRunId] = useState(null);

  const overview = useQuery({
    queryKey: ['model-runtime-overview', 'arena'],
    queryFn: () => overviewFn({ data: {} }),
    enabled: session === 'yes',
    retry: false,
  });
  const history = useQuery({
    queryKey: ['model-arena-runs'],
    queryFn: () => listFn({ data: { limit: 30 } }),
    enabled: session === 'yes',
    retry: false,
  });
  const result = useQuery({
    queryKey: ['model-arena-run', selectedRunId],
    queryFn: () => getFn({ data: { id: selectedRunId } }),
    enabled: session === 'yes' && Boolean(selectedRunId),
    retry: false,
  });

  const configured = useMemo(() => new Map((overview.data?.providers ?? []).map((p) => [p.id, p.configured])), [overview.data]);
  const runMutation = useMutation({
    mutationFn: () => runFn({
      data: {
        name: name.trim(),
        prompt: prompt.trim(),
        systemPrompt: systemPrompt.trim() || null,
        contestants: contestants.map((row) => ({ provider: row.provider, model: row.model.trim(), label: row.label.trim() || undefined })),
        judge: { provider: judge.provider, model: judge.model.trim(), label: judge.label },
        criteria: criteria.split(',').map((item) => item.trim()).filter(Boolean),
      },
    }),
    onSuccess: async (data) => {
      setSelectedRunId(data.runId);
      await queryClient.invalidateQueries({ queryKey: ['model-arena-runs'] });
      await queryClient.invalidateQueries({ queryKey: ['model-arena-run', data.runId] });
    },
  });

  const canRun = name.trim() && prompt.trim() && judge.model.trim() && contestants.length >= 2 && contestants.every((row) => row.model.trim());
  const scored = useMemo(() => {
    const responses = result.data?.responses ?? [];
    const scores = result.data?.scores ?? [];
    const scoreByResponse = new Map(scores.map((score) => [score.response_id, score]));
    return responses
      .map((response) => ({ ...response, score: scoreByResponse.get(response.id) }))
      .sort((a, b) => Number(b.score?.score ?? -1) - Number(a.score?.score ?? -1));
  }, [result.data]);

  if (session !== 'yes') {
    return <><PageHeader eyebrow="AI" title="Model Arena" description="Evaluate live model responses through PalladiumAI's model gateway." /><Loading text="Waiting for workspace session…" /></>;
  }

  return (
    <>
      <PageHeader
        eyebrow="AI Evaluation"
        title="Model Arena"
        description="Run the same real prompt across multiple configured providers, then score the outputs with an independent LLM judge. Results, latency, token use and judge reasoning are persisted for audit and comparison."
        action={<span className="inline-flex items-center gap-1.5 rounded-xl border border-violet-400/20 bg-violet-400/10 px-3 py-2 text-[11px] text-violet-200"><FlaskConical className="h-3.5 w-3.5" />Live gateway evaluation</span>}
      />

      {astraHandoff && (
        <div className="mb-5 rounded-2xl border border-violet-400/20 bg-violet-400/[.05] p-4">
          <div className="flex items-start gap-3">
            <FlaskConical className="mt-0.5 h-4 w-4 text-violet-300" />
            <div>
              <p className="text-xs font-semibold text-white">Astra evaluation handoff · {astraHandoff.taskClass}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">The exact Blackstar Astra serving identity <code className="text-violet-200">compatible/{astraHandoff.model}</code> has been preselected as a candidate. Complete a representative benchmark prompt and run enough distinct evaluations for the trusted verifier. Model Arena results alone do not certify the model or grant routing/execution authority.</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.55fr)]">
        <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
          <div className="flex items-center gap-2"><Scale className="h-4 w-4 text-violet-300" /><h2 className="text-sm font-semibold text-white">New evaluation</h2></div>
          <p className="mt-1 text-[11px] text-zinc-500">Only providers configured on this deployment can execute successfully. Credentials remain server-side.</p>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Field label="Run name"><input value={name} onChange={(e) => setName(e.target.value)} className="input" maxLength={160} /></Field>
            <Field label="Scoring criteria"><input value={criteria} onChange={(e) => setCriteria(e.target.value)} className="input" placeholder="correctness, helpfulness, clarity" /></Field>
          </div>
          <div className="mt-3"><Field label="Prompt"><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="input min-h-32 resize-y" placeholder="Enter the prompt every candidate should answer…" maxLength={12000} /></Field></div>
          <div className="mt-3"><Field label="System prompt (optional)"><textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} className="input min-h-20 resize-y" placeholder="Shared system instruction for candidates…" maxLength={6000} /></Field></div>

          <div className="mt-5 flex items-center gap-2"><Bot className="h-4 w-4 text-zinc-400" /><h3 className="text-xs font-semibold text-white">Candidate models</h3><span className="text-[10px] text-zinc-600">2–6 models</span></div>
          <div className="mt-3 space-y-2">
            {contestants.map((row, index) => (
              <div key={index} className="grid gap-2 rounded-xl border border-white/10 bg-black/20 p-3 md:grid-cols-[140px_1fr_150px_auto]">
                <ProviderSelect value={row.provider} onChange={(provider) => updateContestant(index, { provider })} configured={configured} />
                <input value={row.model} onChange={(e) => updateContestant(index, { model: e.target.value })} className="input" placeholder="Model ID" />
                <input value={row.label} onChange={(e) => updateContestant(index, { label: e.target.value })} className="input" placeholder="Label" />
                <button type="button" disabled={contestants.length <= 2} onClick={() => setContestants((rows) => rows.filter((_, i) => i !== index))} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-zinc-500 transition hover:text-rose-300 disabled:opacity-30" aria-label={`Remove candidate ${index + 1}`}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          {contestants.length < 6 && <button type="button" onClick={() => setContestants((rows) => [...rows, { provider: 'openai', model: '', label: `Candidate ${String.fromCharCode(65 + rows.length)}` }])} className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5"><Plus className="h-3.5 w-3.5" />Add candidate</button>}

          <div className="mt-5 flex items-center gap-2"><Sparkles className="h-4 w-4 text-amber-300" /><h3 className="text-xs font-semibold text-white">Independent judge</h3></div>
          <div className="mt-3 grid gap-2 rounded-xl border border-amber-400/15 bg-amber-400/[.03] p-3 md:grid-cols-[140px_1fr]">
            <ProviderSelect value={judge.provider} onChange={(provider) => setJudge((value) => ({ ...value, provider }))} configured={configured} />
            <input value={judge.model} onChange={(e) => setJudge((value) => ({ ...value, model: e.target.value }))} className="input" placeholder="Judge model ID" />
          </div>

          {runMutation.error && <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/[.05] p-3 text-xs text-rose-200">{friendlyMessage(runMutation.error)}</div>}
          <button type="button" disabled={!canRun || runMutation.isPending} onClick={() => runMutation.mutate()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
            {runMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}{runMutation.isPending ? 'Running models and judge…' : 'Run evaluation'}
          </button>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
          <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-violet-300" /><h2 className="text-sm font-semibold text-white">Recent runs</h2></div>
          {history.isLoading ? <Loading text="Loading evaluation history…" /> : history.error ? <ErrorBox error={history.error} /> : (history.data?.runs ?? []).length ? (
            <div className="mt-4 space-y-2">{history.data.runs.map((run) => <button type="button" key={run.id} onClick={() => setSelectedRunId(run.id)} className={`w-full rounded-xl border p-3 text-left transition ${selectedRunId === run.id ? 'border-violet-400/30 bg-violet-400/[.08]' : 'border-white/10 bg-black/20 hover:bg-white/[.04]'}`}><div className="flex items-center gap-2"><p className="min-w-0 flex-1 truncate text-xs font-medium text-white">{run.name}</p><Status status={run.status} /></div><p className="mt-1 line-clamp-2 text-[10px] text-zinc-500">{run.prompt}</p><p className="mt-2 text-[10px] text-zinc-600">{new Date(run.created_at).toLocaleString('en-GB')}</p></button>)}</div>
          ) : <p className="mt-4 rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-zinc-500">No model evaluations yet.</p>}
        </section>
      </div>

      {selectedRunId && <section className="mt-5 rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <div className="flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-300" /><h2 className="text-sm font-semibold text-white">Evaluation results</h2></div>
        {result.isLoading ? <Loading text="Loading scores…" /> : result.error ? <ErrorBox error={result.error} /> : scored.length ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">{scored.map((row, index) => <article key={row.id} className={`rounded-2xl border p-4 ${index === 0 && row.score ? 'border-amber-400/25 bg-amber-400/[.04]' : 'border-white/10 bg-black/20'}`}><div className="flex items-start gap-2"><div className="grid h-8 w-8 place-items-center rounded-xl bg-white/5 text-xs font-bold text-zinc-300">#{index + 1}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{row.label || `${row.provider}/${row.model}`}</p><p className="truncate text-[10px] text-zinc-500">{row.provider} · {row.model}</p></div>{row.score && <div className="text-right"><p className="text-xl font-semibold text-amber-200">{Number(row.score.score).toFixed(1)}</p><p className="text-[9px] uppercase tracking-wide text-zinc-600">/ 100</p></div>}</div><div className="mt-3 flex gap-3 text-[10px] text-zinc-500"><span className="inline-flex items-center gap-1"><Gauge className="h-3 w-3" />{row.latency_ms ?? 0} ms</span><span>{Number(row.input_tokens ?? 0) + Number(row.output_tokens ?? 0)} tokens</span></div>{row.score?.verdict && <p className="mt-3 text-xs font-medium text-violet-200">{row.score.verdict}</p>}{row.score?.reasoning && <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">{row.score.reasoning}</p>}<details className="mt-3"><summary className="cursor-pointer text-[10px] text-zinc-500">View response</summary><pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-black/30 p-3 text-[11px] leading-relaxed text-zinc-300">{row.response_text}</pre></details></article>)}</div>
        ) : <p className="mt-4 text-xs text-zinc-500">This run has no persisted responses yet.</p>}
      </section>}
      <style>{`.input{width:100%;border-radius:.75rem;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.3);padding:.55rem .75rem;font-size:.75rem;color:white;outline:none}.input:focus{border-color:rgba(139,92,246,.45);box-shadow:0 0 0 2px rgba(139,92,246,.08)}.input::placeholder{color:rgb(82 82 91)}`}</style>
    </>
  );

  function updateContestant(index, patch) {
    setContestants((rows) => rows.map((row, i) => i === index ? { ...row, ...patch } : row));
  }
}

function Field({ label, children }) { return <label className="block"><span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</span>{children}</label>; }
function Loading({ text }) { return <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-4 text-xs text-zinc-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />{text}</div>; }
function ErrorBox({ error }) { return <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/[.05] p-3 text-xs text-rose-200">{friendlyMessage(error)}</div>; }
function Status({ status }) { const tone = status === 'completed' ? 'text-emerald-300' : status === 'failed' ? 'text-rose-300' : 'text-amber-300'; return <span className={`text-[10px] font-medium ${tone}`}>{status}</span>; }
function ProviderSelect({ value, onChange, configured }) { return <select value={value} onChange={(e) => onChange(e.target.value)} className="input"><option value="" disabled>Provider</option>{PROVIDERS.map((provider) => <option key={provider} value={provider}>{provider}{configured.has(provider) ? configured.get(provider) ? ' · ready' : ' · not configured' : ''}</option>)}</select>; }
