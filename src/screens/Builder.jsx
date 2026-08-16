import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Bot, CheckCircle2, Code2, Database, GitBranch, Loader2, LockKeyhole, RefreshCw, Rocket, Sparkles, TerminalSquare, TriangleAlert, Workflow, X } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import NeuralNetworkBackground from '@/components/visual/NeuralNetworkBackground';
import { toast } from '@/components/ui/use-toast';
import { friendlyMessage } from '@/lib/errors';
import {
  cancelBuilderJob,
  createBuilderJob,
  generateBuilderJobPlan,
  generateBuilderJobSource,
  listBuilderGitHubRepositories,
  listBuilderJobs,
  queueBuilderBranchApproval,
  queueBuilderFileApprovals,
  refreshBuilderRepositoryStatus,
} from '@/lib/builder/builder.functions';
import { listBuilderSandboxStates, runBuilderSandboxJob } from '@/lib/builder/builder-sandbox.functions';
import { acceptBuilderRepair, generateBuilderRepair, listBuilderRepairStates } from '@/lib/builder/builder-repair.functions';
import { createBuilderPreviewDeployment, listBuilderDeployments, refreshBuilderDeployment } from '@/lib/builder/builder-deploy.functions';

export default function Builder() {
  const qc = useQueryClient();
  const listFn = useServerFn(listBuilderJobs);
  const repoListFn = useServerFn(listBuilderGitHubRepositories);
  const createFn = useServerFn(createBuilderJob);
  const planFn = useServerFn(generateBuilderJobPlan);
  const sourceFn = useServerFn(generateBuilderJobSource);
  const branchApprovalFn = useServerFn(queueBuilderBranchApproval);
  const fileApprovalFn = useServerFn(queueBuilderFileApprovals);
  const refreshRepositoryFn = useServerFn(refreshBuilderRepositoryStatus);
  const cancelFn = useServerFn(cancelBuilderJob);
  const sandboxListFn = useServerFn(listBuilderSandboxStates);
  const sandboxRunFn = useServerFn(runBuilderSandboxJob);
  const repairListFn = useServerFn(listBuilderRepairStates);
  const repairGenerateFn = useServerFn(generateBuilderRepair);
  const repairAcceptFn = useServerFn(acceptBuilderRepair);
  const deploymentListFn = useServerFn(listBuilderDeployments);
  const previewDeployFn = useServerFn(createBuilderPreviewDeployment);
  const deploymentRefreshFn = useServerFn(refreshBuilderDeployment);
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [repositoryChoice, setRepositoryChoice] = useState({});

  const jobs = useQuery({ queryKey: ['builder-jobs'], queryFn: () => listFn(), retry: false });
  const repositories = useQuery({ queryKey: ['builder-github-repositories'], queryFn: () => repoListFn(), retry: false });
  const sandboxStates = useQuery({ queryKey: ['builder-sandbox-states'], queryFn: () => sandboxListFn(), retry: false });
  const repairStates = useQuery({ queryKey: ['builder-repair-states'], queryFn: () => repairListFn(), retry: false });
  const deployments = useQuery({ queryKey: ['builder-deployments'], queryFn: () => deploymentListFn(), retry: false });
  const refreshJobs = () => qc.invalidateQueries({ queryKey: ['builder-jobs'] });
  const refreshSandbox = () => qc.invalidateQueries({ queryKey: ['builder-sandbox-states'] });
  const refreshRepair = () => qc.invalidateQueries({ queryKey: ['builder-repair-states'] });
  const refreshDeployments = () => qc.invalidateQueries({ queryKey: ['builder-deployments'] });

  const createJob = useMutation({
    mutationFn: () => createFn({ data: { title, prompt } }),
    onSuccess: async () => { setTitle(''); setPrompt(''); await refreshJobs(); toast({ title: 'Build request saved' }); },
    onError: (error) => toast({ title: 'Could not save build request', description: friendlyMessage(error), variant: 'destructive' }),
  });
  const planJob = useMutation({
    mutationFn: (id) => planFn({ data: { id } }),
    onSuccess: async () => { await refreshJobs(); toast({ title: 'AI build plan ready' }); },
    onError: async (error) => { await refreshJobs(); toast({ title: 'Could not generate build plan', description: friendlyMessage(error), variant: 'destructive' }); },
  });
  const sourceJob = useMutation({
    mutationFn: (id) => sourceFn({ data: { id } }),
    onSuccess: async () => { await refreshJobs(); toast({ title: 'Source manifest ready', description: 'Review every file before starting the GitHub handoff.' }); },
    onError: async (error) => { await refreshJobs(); toast({ title: 'Could not generate source', description: friendlyMessage(error), variant: 'destructive' }); },
  });
  const branchApproval = useMutation({
    mutationFn: ({ id, repository }) => branchApprovalFn({ data: { id, repository } }),
    onSuccess: async () => { await refreshJobs(); toast({ title: 'Branch approval queued', description: 'Approve the high-risk request before continuing.' }); },
    onError: async (error) => { await refreshJobs(); toast({ title: 'Could not queue branch approval', description: friendlyMessage(error), variant: 'destructive' }); },
  });
  const fileApprovals = useMutation({
    mutationFn: (id) => fileApprovalFn({ data: { id } }),
    onSuccess: async (result) => {
      await refreshJobs();
      const count = result.fileApprovalIds?.length ?? 0;
      toast({ title: count ? `${count} file approval${count === 1 ? '' : 's'} queued` : 'Repository already matches generated source', description: count ? 'Each mutation remains blocked until its high-risk approval is approved.' : 'No GitHub file mutation was needed.' });
    },
    onError: async (error) => { await refreshJobs(); toast({ title: 'Could not queue file approvals', description: friendlyMessage(error), variant: 'destructive' }); },
  });
  const refreshRepository = useMutation({
    mutationFn: (id) => refreshRepositoryFn({ data: { id } }),
    onSuccess: async (result) => { await refreshJobs(); toast({ title: 'Repository status refreshed', description: repositoryStatusCopy(result.repositoryStatus) }); },
    onError: (error) => toast({ title: 'Could not refresh repository status', description: friendlyMessage(error), variant: 'destructive' }),
  });
  const sandboxRun = useMutation({
    mutationFn: (id) => sandboxRunFn({ data: { id } }),
    onSuccess: async (result) => { await refreshSandbox(); toast({ title: result.sandboxStatus === 'passed' ? 'Isolated validation passed' : 'Isolated validation finished', description: result.sandboxStatus === 'passed' ? 'Install and available build/typecheck/test scripts passed in E2B.' : 'Review the isolated stage logs below.' }); },
    onError: async (error) => { await refreshSandbox(); toast({ title: 'Isolated validation failed', description: friendlyMessage(error), variant: 'destructive' }); },
  });
  const generateRepair = useMutation({
    mutationFn: (id) => repairGenerateFn({ data: { id } }),
    onSuccess: async () => { await refreshRepair(); toast({ title: 'Repair proposal ready', description: 'Review every proposed file before accepting it.' }); },
    onError: async (error) => { await refreshRepair(); toast({ title: 'Could not generate repair proposal', description: friendlyMessage(error), variant: 'destructive' }); },
  });
  const acceptRepair = useMutation({
    mutationFn: (id) => repairAcceptFn({ data: { id } }),
    onSuccess: async () => { await Promise.all([refreshJobs(), refreshSandbox(), refreshRepair()]); toast({ title: 'Repair accepted', description: 'The repaired source must now pass a fresh GitHub file-approval batch and isolated validation.' }); },
    onError: (error) => toast({ title: 'Could not accept repair proposal', description: friendlyMessage(error), variant: 'destructive' }),
  });
  const deployPreview = useMutation({
    mutationFn: (id) => previewDeployFn({ data: { id } }),
    onSuccess: async (result) => { await refreshDeployments(); toast({ title: result.status === 'ready' ? 'Preview deployment ready' : 'Preview deployment started', description: result.status === 'ready' ? 'The Vercel preview URL is ready.' : 'Refresh the deployment status while Vercel builds it.' }); },
    onError: async (error) => { await refreshDeployments(); toast({ title: 'Could not deploy preview', description: friendlyMessage(error), variant: 'destructive' }); },
  });
  const refreshDeployment = useMutation({
    mutationFn: (id) => deploymentRefreshFn({ data: { id } }),
    onSuccess: async (result) => { await refreshDeployments(); toast({ title: 'Preview status refreshed', description: result.status === 'ready' ? 'The preview is ready.' : result.status === 'failed' ? 'The preview deployment failed.' : 'Vercel is still building the preview.' }); },
    onError: (error) => toast({ title: 'Could not refresh preview deployment', description: friendlyMessage(error), variant: 'destructive' }),
  });
  const cancelJob = useMutation({
    mutationFn: (id) => cancelFn({ data: { id } }),
    onSuccess: async () => { await refreshJobs(); toast({ title: 'Build request cancelled' }); },
    onError: (error) => toast({ title: 'Could not cancel build request', description: friendlyMessage(error), variant: 'destructive' }),
  });

  const canSubmit = title.trim().length > 0 && prompt.trim().length >= 20 && !createJob.isPending;

  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 opacity-30"><NeuralNetworkBackground intensity="low" /></div>
      <PageHeader eyebrow="Build" title="AI App Builder" description="Create durable requests, live AI plans and reviewable source, move GitHub mutations through approval, then validate the generated app in an isolated E2B sandbox before deployment." />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,.85fr)]">
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
          <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-300"><Bot className="h-4 w-4" /></span><div><h2 className="text-sm font-semibold text-white">New build request</h2><p className="mt-1 text-xs leading-5 text-zinc-500">Save the request, generate a plan, generate source, review it, then explicitly start the GitHub approval flow.</p></div></div>
          <div className="mt-5 space-y-4">
            <label className="block"><span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-zinc-500">App name</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="Customer support portal" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" /></label>
            <label className="block"><span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-zinc-500">What should PalladiumAI build?</span><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={12000} rows={9} placeholder="Describe the users, pages, workflows, data and integrations the app needs…" className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm leading-6 text-white placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" /><div className="mt-1.5 flex justify-between text-[10px] text-zinc-600"><span>Minimum 20 characters</span><span>{prompt.length}/12000</span></div></label>
            <button onClick={() => createJob.mutate()} disabled={!canSubmit} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">{createJob.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Save build request</button>
          </div>
        </div>

        <Panel title="Current production boundary" icon={LockKeyhole}>
          <div className="space-y-2 text-xs leading-5 text-zinc-400">
            <Requirement icon={Database} text="Build requests are durable and owner-scoped" ready />
            <Requirement icon={Bot} text="AI planning uses the live model gateway" ready />
            <Requirement icon={Code2} text="Generated source is bounded, persisted and reviewable" ready />
            <Requirement icon={GitBranch} text="Branch and file writes use high-risk approval with SHA-safe updates" ready />
            <Requirement icon={Workflow} text="Isolated E2B install/build/typecheck/test validation is live" ready />
            <Requirement icon={Sparkles} text="Failed validation can generate a reviewable, approval-gated repair proposal" ready />
            <Requirement icon={Rocket} text="Vercel preview deployment is explicit, owner-scoped and sandbox-gated" ready />
            <Requirement icon={LockKeyhole} text="Production publish remains disabled" />
          </div>
        </Panel>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-white">Your build requests</h2><p className="mt-1 text-xs text-zinc-500">Live persisted planning, source and repository handoff state.</p></div>{jobs.isFetching && <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />}</div>
        {jobs.error ? <ErrorBox text={friendlyMessage(jobs.error)} /> : jobs.isLoading ? <Loading text="Loading build requests…" /> : (jobs.data ?? []).length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-black/10 p-6 text-center text-xs text-zinc-500">No build requests yet.</div> : (
          <div className="mt-4 space-y-3">{(jobs.data ?? []).map((job) => {
            const isPlanning = planJob.isPending && planJob.variables === job.id;
            const isGeneratingSource = sourceJob.isPending && sourceJob.variables === job.id;
            const isQueueingBranch = branchApproval.isPending && branchApproval.variables?.id === job.id;
            const isQueueingFiles = fileApprovals.isPending && fileApprovals.variables === job.id;
            const isRefreshing = refreshRepository.isPending && refreshRepository.variables === job.id;
            const selectedRepository = repositoryChoice[job.id] ?? repositories.data?.[0]?.fullName ?? '';
            const sandbox = (sandboxStates.data ?? []).find((state) => state.id === job.id) ?? { sandboxStatus: 'not_started', sandboxResults: null, sandboxLastError: null };
            const isRunningSandbox = sandboxRun.isPending && sandboxRun.variables === job.id;
            const repair = (repairStates.data ?? []).find((state) => state.id === job.id) ?? { repairStatus: 'not_started', repairManifest: null, repairLastError: null, repairAttempt: 0 };
            const isGeneratingRepair = generateRepair.isPending && generateRepair.variables === job.id;
            const isAcceptingRepair = acceptRepair.isPending && acceptRepair.variables === job.id;
            const deployment = (deployments.data ?? []).find((item) => item.builderJobId === job.id) ?? null;
            const isDeployingPreview = deployPreview.isPending && deployPreview.variables === job.id;
            const isRefreshingDeployment = refreshDeployment.isPending && refreshDeployment.variables === deployment?.id;
            return (
              <div key={job.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-medium text-white">{job.title}</p><StatusBadge status={isPlanning ? 'planning' : job.status} />{job.status === 'planned' && <StatusBadge status={isGeneratingSource ? 'generating source' : job.sourceStatus} />}{job.repositoryStatus !== 'not_started' && <StatusBadge status={job.repositoryStatus.replaceAll('_', ' ')} />}</div><p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-500">{job.prompt}</p><p className="mt-2 text-[10px] text-zinc-600">Saved {new Date(job.createdAt).toLocaleString()}</p></div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {['requested', 'failed'].includes(job.status) && <ActionButton onClick={() => planJob.mutate(job.id)} disabled={planJob.isPending} icon={isPlanning ? Loader2 : Sparkles} spin={isPlanning}>{job.status === 'failed' ? 'Retry plan' : 'Generate plan'}</ActionButton>}
                    {job.status === 'planned' && ['not_started', 'failed'].includes(job.sourceStatus) && <ActionButton onClick={() => sourceJob.mutate(job.id)} disabled={sourceJob.isPending} icon={isGeneratingSource ? Loader2 : Code2} spin={isGeneratingSource}>{job.sourceStatus === 'failed' ? 'Retry source' : 'Generate source'}</ActionButton>}
                    {['requested', 'planning'].includes(job.status) && <button onClick={() => cancelJob.mutate(job.id)} disabled={cancelJob.isPending} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-400 hover:bg-white/5 hover:text-white disabled:opacity-40"><X className="h-3.5 w-3.5" />Cancel</button>}
                  </div>
                </div>

                {job.lastError && <ErrorBox text={job.lastError} />}{job.sourceLastError && <ErrorBox text={job.sourceLastError} />}{job.repositoryLastError && <ErrorBox text={job.repositoryLastError} />}
                {job.plan && <PlanView plan={job.plan} />}
                {job.sourceManifest && <SourceView manifest={job.sourceManifest} />}

                {job.sourceStatus === 'generated' && job.repositoryStatus === 'not_started' && <RepositoryPicker job={job} repositories={repositories} selectedRepository={selectedRepository} setRepositoryChoice={setRepositoryChoice} onQueue={() => branchApproval.mutate({ id: job.id, repository: selectedRepository })} pending={isQueueingBranch} />}
                {job.repositoryStatus === 'files_applied' && <SandboxValidation job={job} sandbox={sandbox} pending={isRunningSandbox} repair={repair} onRun={() => sandboxRun.mutate(job.id)} />}
                {sandbox.sandboxStatus === 'failed' && <RepairProposal repair={repair} generating={isGeneratingRepair} accepting={isAcceptingRepair} onGenerate={() => generateRepair.mutate(job.id)} onAccept={() => acceptRepair.mutate(job.id)} />}
                {sandbox.sandboxStatus === 'passed' && <PreviewDeployment deployment={deployment} deploying={isDeployingPreview} refreshing={isRefreshingDeployment} onDeploy={() => deployPreview.mutate(job.id)} onRefresh={() => deployment && refreshDeployment.mutate(deployment.id)} />}
                {['branch_approval_pending', 'branch_ready', 'files_approval_pending', 'files_applied', 'failed'].includes(job.repositoryStatus) && (
                  <RepositoryHandoff
                    job={job}
                    isRefreshing={isRefreshing}
                    isQueueingFiles={isQueueingFiles}
                    onRefresh={() => refreshRepository.mutate(job.id)}
                    onQueueFiles={() => fileApprovals.mutate(job.id)}
                  />
                )}
              </div>
            );
          })}</div>
        )}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StateCard icon={Bot} title="AI planning" value="Live" text="Plans are generated by the configured live model and persisted." />
        <StateCard icon={Code2} title="Source generation" value="Live" text="Generated source is bounded, validated and reviewable." />
        <StateCard icon={GitBranch} title="GitHub handoff" value="Approval-gated" text="Branch creation and each changed file are individually approval-gated." />
        <StateCard icon={TerminalSquare} title="Sandbox validation" value="Live · E2B" text="Generated source is installed and checked in an isolated E2B sandbox." />
        <StateCard icon={Sparkles} title="Repair loop" value="Review-gated" text="Failed sandbox evidence can generate a bounded repair proposal that must be accepted and re-approved." />
        <StateCard icon={Rocket} title="Deployment" value="Vercel preview live" text="Sandbox-passed apps can be explicitly deployed to preview. Production publish remains disabled." />
      </div>
    </>
  );
}

function PreviewDeployment({ deployment, deploying, refreshing, onDeploy, onRefresh }) {
  const active = deployment && ['queued', 'uploading', 'building'].includes(deployment.status);
  return (
    <div className="mt-4 rounded-xl border border-blue-400/15 bg-blue-400/[.035] p-4 text-[11px] leading-5 text-zinc-400">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><div className="flex items-center gap-2 font-medium text-blue-100"><Rocket className="h-4 w-4" />Vercel preview · {deploying ? 'uploading' : deployment?.status ?? 'not deployed'}</div><p className="mt-1 text-zinc-500">Preview only. Vercel credentials stay on the PalladiumAI server and are never sent to generated code or the E2B sandbox.</p></div><div className="flex gap-2">{!deployment || ['failed', 'cancelled'].includes(deployment.status) ? <button onClick={onDeploy} disabled={deploying} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/15 px-3 py-1.5 font-medium text-blue-100 ring-1 ring-blue-400/20 disabled:opacity-40">{deploying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}{deployment?.status === 'failed' ? 'Retry preview deployment' : 'Deploy preview'}</button> : null}{active && <button onClick={onRefresh} disabled={refreshing} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-zinc-300 disabled:opacity-40">{refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}Refresh</button>}</div></div>
      {deployment?.lastError && <ErrorBox text={deployment.lastError} />}
      {deployment?.url && <a href={deployment.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex break-all text-blue-300 underline decoration-blue-400/30 underline-offset-4 hover:text-blue-200">{deployment.url}</a>}
      {deployment?.providerDeploymentId && <p className="mt-2 text-[10px] text-zinc-600">Vercel deployment: {deployment.providerDeploymentId}</p>}
      <p className="mt-2 text-[10px] text-zinc-600">Production publish is intentionally disabled.</p>
    </div>
  );
}

function RepairProposal({ repair, generating, accepting, onGenerate, onAccept }) {
  const proposal = repair.repairManifest;
  const canGenerate = ['not_started', 'accepted', 'failed'].includes(repair.repairStatus) && repair.repairAttempt < 10 && !generating;
  return (
    <div className="mt-4 rounded-xl border border-fuchsia-400/15 bg-fuchsia-400/[.035] p-4 text-[11px] leading-5 text-zinc-400">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><div className="flex items-center gap-2 font-medium text-fuchsia-100"><Sparkles className="h-4 w-4" />AI repair proposal · attempt {repair.repairAttempt}/10</div><p className="mt-1 text-zinc-500">Uses failed sandbox evidence as untrusted diagnostic data. Nothing is written to GitHub until you accept the proposal and approve a new file batch.</p></div>{canGenerate && <button onClick={onGenerate} disabled={generating} className="inline-flex items-center gap-1.5 rounded-lg bg-fuchsia-500/15 px-3 py-1.5 font-medium text-fuchsia-100 ring-1 ring-fuchsia-400/20 disabled:opacity-40">{generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}{repair.repairStatus === 'failed' ? 'Retry repair proposal' : 'Generate repair proposal'}</button>}</div>
      {repair.repairLastError && <ErrorBox text={repair.repairLastError} />}
      {proposal && <><div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3"><p className="font-medium text-zinc-200">{proposal.summary}</p><div className="mt-2 space-y-2">{(proposal.files ?? []).map((file) => <details key={file.path} className="rounded border border-white/10"><summary className="cursor-pointer px-2 py-1.5 text-zinc-300">{file.path}<span className="ml-2 text-zinc-600">{file.purpose}</span></summary><pre className="max-h-64 overflow-auto border-t border-white/10 p-2 text-[10px] text-zinc-400">{file.content}</pre></details>)}</div></div><button onClick={onAccept} disabled={accepting} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 font-medium text-emerald-100 ring-1 ring-emerald-400/20 disabled:opacity-40">{accepting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}Accept repair and re-enter approvals</button></>}
    </div>
  );
}

function SandboxValidation({ job, sandbox, pending, repair, onRun }) {
  const canRun = ['not_started', 'failed'].includes(sandbox.sandboxStatus) && repair.repairStatus !== 'proposed' && repair.repairStatus !== 'generating' && !pending;
  const stages = sandbox.sandboxResults?.stages ?? [];
  return (
    <div className="mt-4 rounded-xl border border-cyan-400/15 bg-cyan-400/[.035] p-4 text-[11px] leading-5 text-zinc-400">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><div className="flex items-center gap-2 font-medium text-cyan-100"><TerminalSquare className="h-4 w-4" />Isolated E2B validation · {pending ? 'running' : sandbox.sandboxStatus.replaceAll('_', ' ')}</div><p className="mt-1 text-zinc-500">Runs the exact persisted source manifest in a temporary sandbox. No validation command executes on the PalladiumAI app server.</p></div>
        {canRun && <button onClick={onRun} disabled={pending} className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/15 px-3 py-1.5 font-medium text-cyan-100 ring-1 ring-cyan-400/20 disabled:opacity-40">{pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TerminalSquare className="h-3.5 w-3.5" />}{sandbox.sandboxStatus === 'failed' ? 'Retry isolated validation' : 'Run isolated validation'}</button>}
      </div>
      {sandbox.sandboxLastError && <ErrorBox text={sandbox.sandboxLastError} />}
      {stages.length > 0 && <div className="mt-3 space-y-2">{stages.map((stage) => <details key={stage.name} className="rounded-lg border border-white/10 bg-black/20"><summary className="cursor-pointer px-3 py-2 text-zinc-300">{stage.name} · {stage.status}{stage.exitCode != null ? ` · exit ${stage.exitCode}` : ''}</summary><div className="border-t border-white/10 p-3">{stage.command && <p className="mb-2 font-mono text-[10px] text-zinc-500">{stage.command}</p>}{stage.reason && <p>{stage.reason}</p>}{stage.stdout && <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-[10px] text-zinc-400">{stage.stdout}</pre>}{stage.stderr && <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-[10px] text-rose-300">{stage.stderr}</pre>}</div></details>)}</div>}
      {sandbox.sandboxId && <p className="mt-2 text-[10px] text-zinc-600">E2B sandbox: {sandbox.sandboxId}</p>}
    </div>
  );
}

function RepositoryPicker({ job, repositories, selectedRepository, setRepositoryChoice, onQueue, pending }) {
  return (
    <div className="mt-4 rounded-xl border border-sky-400/15 bg-sky-400/[.035] p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-sky-200"><GitBranch className="h-4 w-4" />Choose connected GitHub repository</div>
      <p className="mt-2 text-[11px] leading-5 text-zinc-500">This first queues only the dedicated Builder branch. Source files remain untouched until separate file approvals are queued and approved.</p>
      {repositories.error ? <ErrorBox text={friendlyMessage(repositories.error)} /> : repositories.isLoading ? <Loading text="Loading connected repositories…" /> : (repositories.data ?? []).length === 0 ? <p className="mt-3 text-[11px] text-zinc-500">No connected GitHub repositories are available.</p> : (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <select value={selectedRepository} onChange={(event) => setRepositoryChoice((current) => ({ ...current, [job.id]: event.target.value }))} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white"><option value="" disabled>Select repository</option>{repositories.data.map((repo) => <option key={repo.fullName} value={repo.fullName}>{repo.fullName} · {repo.defaultBranch}{repo.private ? ' · private' : ''}</option>)}</select>
          <button onClick={onQueue} disabled={!selectedRepository || pending} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-sky-500/15 px-3 py-2 text-[11px] font-medium text-sky-200 ring-1 ring-sky-400/20 disabled:opacity-40">{pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GitBranch className="h-3.5 w-3.5" />}Queue branch approval</button>
        </div>
      )}
    </div>
  );
}

function RepositoryHandoff({ job, isRefreshing, isQueueingFiles, onRefresh, onQueueFiles }) {
  const fileApprovals = Array.isArray(job.fileApprovalIds) ? job.fileApprovalIds : [];
  return (
    <div className="mt-4 rounded-xl border border-amber-400/15 bg-amber-400/[.035] p-4 text-[11px] leading-5 text-zinc-400">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><div className="flex items-center gap-2 font-medium text-amber-100"><GitBranch className="h-4 w-4" />GitHub handoff · {job.repositoryStatus.replaceAll('_', ' ')}</div><p className="mt-1">{job.repositoryFullName} · {job.branchName}</p></div>
        <div className="flex flex-wrap gap-2">
          {job.repositoryStatus !== 'files_applied' && <button onClick={onRefresh} disabled={isRefreshing} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-300 disabled:opacity-40">{isRefreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}Refresh status</button>}
          {job.repositoryStatus === 'branch_ready' && <button onClick={onQueueFiles} disabled={isQueueingFiles} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-2.5 py-1.5 text-[11px] font-medium text-amber-100 ring-1 ring-amber-400/20 disabled:opacity-40">{isQueueingFiles ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Code2 className="h-3.5 w-3.5" />}Queue file approvals</button>}
        </div>
      </div>
      {job.repositoryStatus === 'branch_approval_pending' && <p className="mt-2">Approve the branch creation request, then refresh status. No file approval can be queued before the approved branch exists.</p>}
      {job.repositoryStatus === 'branch_ready' && <p className="mt-2">The approved Builder branch now exists. Queue file approvals to compare the generated manifest with the branch and request only the required creates/updates.</p>}
      {job.repositoryStatus === 'files_approval_pending' && <p className="mt-2">{fileApprovals.length} file mutation approval{fileApprovals.length === 1 ? '' : 's'} pending. Refresh after decisions are complete.</p>}
      {job.repositoryStatus === 'files_applied' && <div className="mt-2 flex items-center gap-2 text-emerald-200"><CheckCircle2 className="h-4 w-4" />Generated source has been applied, or the target branch already matched it.</div>}
      {job.branchApprovalId && <p className="mt-2 text-[10px] text-zinc-600">Branch approval: {job.branchApprovalId}</p>}
      {fileApprovals.length > 0 && <div className="mt-2 space-y-1">{fileApprovals.map((approval) => <p key={approval.id} className="text-[10px] text-zinc-600">{approval.action} · {approval.path} · {approval.status} · {approval.id}</p>)}</div>}
    </div>
  );
}

function repositoryStatusCopy(status) {
  if (status === 'branch_ready') return 'The approved Builder branch exists and is ready for file approvals.';
  if (status === 'files_approval_pending') return 'File mutation approvals are still pending.';
  if (status === 'files_applied') return 'Generated source has been applied to the Builder branch.';
  if (status === 'failed') return 'The GitHub handoff needs attention.';
  return 'No repository state change yet.';
}

function ErrorBox({ text }) { return <div className="mt-3 flex gap-2 rounded-lg border border-rose-400/15 bg-rose-400/[.04] p-3 text-[11px] text-rose-200"><TriangleAlert className="h-3.5 w-3.5 shrink-0" />{text}</div>; }
function Loading({ text }) { return <div className="mt-3 flex items-center gap-2 text-[11px] text-zinc-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />{text}</div>; }
function ActionButton({ onClick, disabled, icon: Icon, spin, children }) { return <button onClick={onClick} disabled={disabled} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500/15 px-3 py-1.5 text-[11px] font-medium text-violet-200 ring-1 ring-violet-400/20 disabled:opacity-40"><Icon className={`h-3.5 w-3.5 ${spin ? 'animate-spin' : ''}`} />{children}</button>; }

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
