import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Bot, CheckCircle2, Code2, Database, GitBranch, Loader2, LockKeyhole, Rocket, Sparkles, TriangleAlert, Workflow, X } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import NeuralNetworkBackground from '@/components/visual/NeuralNetworkBackground';
import { toast } from '@/components/ui/use-toast';
import { friendlyMessage } from '@/lib/errors';
import { cancelBuilderJob, createBuilderJob, generateBuilderJobPlan, generateBuilderJobSource, listBuilderJobs } from '@/lib/builder/builder.functions';

export default function Builder() {
  const qc = useQueryClient();
  const listFn = useServerFn(listBuilderJobs);
  const createFn = useServerFn(createBuilderJob);
  const planFn = useServerFn(generateBuilderJobPlan);
  const sourceFn = useServerFn(generateBuilderJobSource);
  const cancelFn = useServerFn(cancelBuilderJob);
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');

  const jobs = useQuery({ queryKey: ['builder-jobs'], queryFn: () => listFn(), retry: false });

  const createJob = useMutation({
    mutationFn: () => createFn({ data: { title, prompt } }),
    onSuccess: async () => {
      setTitle(''); setPrompt('');
      await qc.invalidateQueries({ queryKey: ['builder-jobs'] });
      toast({ title: 'Build request saved', description: 'Generate a live AI plan when you are ready.' });
    },
    onError: (error) => toast({ title: 'Could not save build request', description: friendlyMessage(error), variant: 'destructive' }),
  });

  const planJob = useMutation({
    mutationFn: (id) => planFn({ data: { id } }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['builder-jobs'] }); toast({ title: 'AI build plan ready' }); },
    onError: async (error) => { await qc.invalidateQueries({ queryKey: ['builder-jobs'] }); toast({ title: 'Could not generate build plan', description: friendlyMessage(error), variant: 'destructive' }); },
  });

  const sourceJob = useMutation({
    mutationFn: (id) => sourceFn({ data: { id } }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['builder-jobs'] }); toast({ title: 'Source manifest ready', description: 'Review the generated files before any GitHub write is requested.' }); },
    onError: async (error) => { await qc.invalidateQueries({ queryKey: ['builder-jobs'] }); toast({ title: 'Could not generate source', description: friendlyMessage(error), variant: 'destructive' }); },
  });

  const cancelJob = useMutation({
    mutationFn: (id) => cancelFn({ data: { id } }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['builder-jobs'] }); toast({ title: 'Build request cancelled' }); },
    onError: (error) => toast({ title: 'Could not cancel build request', description: friendlyMessage(error), variant: 'destructive' }),
  });

  const canSubmit = title.trim().length > 0 && prompt.trim().length >= 20 && !createJob.isPending;

  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 opacity-30"><NeuralNetworkBackground intensity="low" /></div>
      <PageHeader eyebrow="Build" title="AI App Builder" description="Create durable build requests, persisted AI plans and reviewable source manifests. GitHub mutation, sandbox execution and deployment remain approval-gated or disabled until their production stages are connected." />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,.85fr)]">
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
          <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-300"><Bot className="h-4 w-4" /></span><div><h2 className="text-sm font-semibold text-white">New build request</h2><p className="mt-1 text-xs leading-5 text-zinc-500">Save the request, generate a live implementation plan, then generate a bounded source manifest for review.</p></div></div>
          <div className="mt-5 space-y-4">
            <label className="block"><span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-zinc-500">App name</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="Customer support portal" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" /></label>
            <label className="block"><span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-zinc-500">What should PalladiumAI build?</span><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={12000} rows={9} placeholder="Describe the users, pages, workflows, data and integrations the app needs…" className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm leading-6 text-white placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" /><div className="mt-1.5 flex justify-between text-[10px] text-zinc-600"><span>Minimum 20 characters</span><span>{prompt.length}/12000</span></div></label>
            <button onClick={() => createJob.mutate()} disabled={!canSubmit} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">{createJob.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Save build request</button>
          </div>
        </div>

        <Panel title="Current production boundary" icon={LockKeyhole}>
          <div className="space-y-2 text-xs leading-5 text-zinc-400">
            <Requirement icon={Database} text="Build requests are durable and owner-scoped" ready />
            <Requirement icon={Bot} text="AI plans run through the live model gateway and persist" ready />
            <Requirement icon={Code2} text="Source manifests are generated, validated and persisted for review" ready />
            <Requirement icon={GitBranch} text="GitHub writes require the existing high-risk approval pipeline" />
            <Requirement icon={Workflow} text="Sandboxed build/test execution remains disabled" />
            <Requirement icon={Rocket} text="Deployment remains disabled" />
          </div>
        </Panel>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-white">Your build requests</h2><p className="mt-1 text-xs text-zinc-500">Live workspace records with persisted planning and source state.</p></div>{jobs.isFetching && <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />}</div>
        {jobs.error ? <div className="mt-4 flex gap-2 rounded-xl border border-rose-400/20 bg-rose-400/[.05] p-4 text-xs text-rose-200"><TriangleAlert className="h-4 w-4 shrink-0" /><span>{friendlyMessage(jobs.error)}</span></div> : jobs.isLoading ? <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-4 text-xs text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" />Loading build requests…</div> : (jobs.data ?? []).length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-black/10 p-6 text-center text-xs text-zinc-500">No build requests yet.</div> : (
          <div className="mt-4 space-y-3">{(jobs.data ?? []).map((job) => {
            const isPlanning = planJob.isPending && planJob.variables === job.id;
            const isGeneratingSource = sourceJob.isPending && sourceJob.variables === job.id;
            return <div key={job.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-medium text-white">{job.title}</p><StatusBadge status={isPlanning ? 'planning' : job.status} />{job.status === 'planned' && <StatusBadge status={isGeneratingSource ? 'generating source' : job.sourceStatus} />}</div><p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-500">{job.prompt}</p><p className="mt-2 text-[10px] text-zinc-600">Saved {new Date(job.createdAt).toLocaleString()}</p></div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {['requested', 'failed'].includes(job.status) && <button onClick={() => planJob.mutate(job.id)} disabled={planJob.isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500/15 px-3 py-1.5 text-[11px] font-medium text-violet-200 ring-1 ring-violet-400/20 disabled:opacity-40">{isPlanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}{job.status === 'failed' ? 'Retry plan' : 'Generate plan'}</button>}
                  {job.status === 'planned' && ['not_started', 'failed'].includes(job.sourceStatus) && <button onClick={() => sourceJob.mutate(job.id)} disabled={sourceJob.isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-[11px] font-medium text-emerald-200 ring-1 ring-emerald-400/20 disabled:opacity-40">{isGeneratingSource ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Code2 className="h-3.5 w-3.5" />}{job.sourceStatus === 'failed' ? 'Retry source' : 'Generate source'}</button>}
                  {['requested', 'planning'].includes(job.status) && <button onClick={() => cancelJob.mutate(job.id)} disabled={cancelJob.isPending} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-400 hover:bg-white/5 hover:text-white disabled:opacity-40"><X className="h-3.5 w-3.5" />Cancel</button>}
                </div>
              </div>
              {job.lastError && <ErrorBox text={job.lastError} />}{job.sourceLastError && <ErrorBox text={job.sourceLastError} />}{job.plan && <PlanView plan={job.plan} />}{job.sourceManifest && <SourceView manifest={job.sourceManifest} />}
            </div>;
          })}</div>
        )}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StateCard icon={Bot} title="AI planning" value="Live" text="Plans are generated by the configured live model and saved to the build job." /><StateCard icon={Code2} title="Source generation" value="Live manifest" text="Generated files are bounded, validated and reviewable before repository mutation." /><StateCard icon={Workflow} title="Build pipeline" value="Next major stage" text="Sandboxed build and test execution remains unavailable." /><StateCard icon={Rocket} title="Deployment" value="Unavailable" text="Deploy stays disabled until a real provider is connected." /></div>
    </>
  );
}

function ErrorBox({ text }) { return <div className="mt-3 flex gap-2 rounded-lg border border-rose-400/15 bg-rose-400/[.04] p-3 text-[11px] text-rose-200"><TriangleAlert className="h-3.5 w-3.5 shrink-0" />{text}</div>; }

function PlanView({ plan }) {
  const sections = [['Architecture', plan.architecture], ['Features', plan.features], ['Data model', plan.dataModel], ['Implementation', plan.implementationSteps], ['Acceptance criteria', plan.acceptanceCriteria]];
  return <div className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-400/[.035] p-4"><div className="flex items-center gap-2 text-xs font-medium text-emerald-200"><CheckCircle2 className="h-4 w-4" />Persisted AI implementation plan</div><p className="mt-2 text-xs leading-5 text-zinc-300">{plan.summary}</p><div className="mt-4 grid gap-4 lg:grid-cols-2">{sections.map(([label, items]) => Array.isArray(items) && items.length > 0 ? <div key={label}><p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p><ul className="mt-1.5 space-y-1.5 text-[11px] leading-5 text-zinc-400">{items.map((item, index) => <li key={`${label}-${index}`} className="flex gap-2"><span className="text-violet-400">•</span><span>{item}</span></li>)}</ul></div> : null)}</div>{plan.generatedBy && <p className="mt-4 border-t border-white/10 pt-3 text-[10px] text-zinc-600">Generated by {plan.generatedBy.provider} · {plan.generatedBy.model}</p>}</div>;
}

function SourceView({ manifest }) {
  return <div className="mt-4 rounded-xl border border-violet-400/15 bg-violet-400/[.035] p-4"><div className="flex items-center gap-2 text-xs font-medium text-violet-200"><Code2 className="h-4 w-4" />Persisted source manifest · {manifest.files?.length ?? 0} files</div><p className="mt-2 text-xs leading-5 text-zinc-300">{manifest.summary}</p><div className="mt-3 space-y-2">{(manifest.files ?? []).map((file) => <details key={file.path} className="rounded-lg border border-white/10 bg-black/20"><summary className="cursor-pointer px-3 py-2 text-[11px] font-medium text-zinc-300">{file.path}<span className="ml-2 font-normal text-zinc-600">{file.purpose}</span></summary><pre className="max-h-80 overflow-auto border-t border-white/10 p-3 text-[10px] leading-5 text-zinc-400">{file.content}</pre></details>)}</div>{manifest.generatedBy && <p className="mt-4 border-t border-white/10 pt-3 text-[10px] text-zinc-600">Generated by {manifest.generatedBy.provider} · {manifest.generatedBy.model}</p>}</div>;
}

function StatusBadge({ status }) { const label = status === 'requested' ? 'Saved' : status === 'not_started' ? 'Source pending' : status; return <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium capitalize text-violet-200">{label}</span>; }
function StateCard({ icon: Icon, title, value, text }) { return <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-violet-300"><Icon className="h-4 w-4" /></span><p className="mt-3 text-[10px] font-medium uppercase tracking-wide text-zinc-600">{title}</p><p className="mt-1 text-sm font-semibold text-white">{value}</p><p className="mt-2 text-xs leading-5 text-zinc-500">{text}</p></div>; }
function Panel({ title, icon: Icon, children }) { return <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-violet-300" /><h2 className="text-sm font-semibold text-white">{title}</h2></div><div className="mt-3">{children}</div></div>; }
function Requirement({ icon: Icon, text, ready = false }) { return <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${ready ? 'border-emerald-400/15 bg-emerald-400/[.04] text-emerald-100' : 'border-white/10 bg-black/20'}`}><Icon className={`h-3.5 w-3.5 shrink-0 ${ready ? 'text-emerald-300' : 'text-violet-300'}`} /><span>{text}</span></div>; }
