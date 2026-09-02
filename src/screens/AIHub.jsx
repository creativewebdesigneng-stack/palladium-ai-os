import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { AppWindow, Bot, Boxes, Cpu, Database, Image, Mic, Network, Play, Search, ServerCog, Store, Video, Workflow, Wrench } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { Failed, Loading } from '@/components/business/live';
import { friendlyMessage } from '@/lib/errors';
import { createPalladiumAiHubRegistry } from '@/lib/ai-hub';
import { listAiHubResources } from '@/lib/ai-hub/resources.functions';
import { executeAiHubAgent, executeAiHubExternalMcp, executeAiHubWorkflow } from '@/lib/ai-hub/execution.functions';
import { installMarketplaceAgent } from '@/lib/marketplace/marketplace.functions';
import { useSessionReady } from '@/lib/useSessionReady';

const icons = { 'model-gateway': Cpu, 'agent-runtime': Bot, mcp: Network, skills: Boxes, workflows: Workflow, 'app-studio': AppWindow };
const resourceIcons = { model: Cpu, agent: Bot, tool: Wrench, mcp: Network, workflow: Workflow, app: AppWindow, dataset: Database, compute: ServerCog, voice: Mic, image: Image, video: Video };
const FILTERS = [['all','All resources'],['model','Models'],['agent','Agents'],['marketplace','Marketplace'],['app','Apps'],['dataset','Datasets'],['compute','Compute'],['voice','Voice'],['image','Images'],['video','Video'],['tool','Tools'],['mcp','MCP'],['workflow','Workflows']];

function statusClasses(status) {
  if (['available','active','enabled','published','preview-ready','production'].includes(status)) return 'border-emerald-400/20 bg-emerald-400/[.08] text-emerald-300';
  if (['unconfigured','paused','disabled'].includes(status)) return 'border-amber-400/20 bg-amber-400/[.08] text-amber-300';
  return 'border-white/10 bg-white/[.04] text-zinc-400';
}
function resourceWorkspace(resource) {
  if (resource.providerId === 'palladium-skills') return { href: '/skills', label: 'Open Skills' };
  if (resource.providerId === 'palladium-app-studio' || resource.providerId === 'palladium-compute') return { href: '/builder', label: resource.kind === 'compute' ? 'Open deployment compute' : 'Open App Studio' };
  if (resource.providerId === 'palladium-model-gateway') return { href: '/models', label: 'Open Runtime Models' };
  if (resource.providerId === 'palladium-mcp' || resource.kind === 'mcp') return { href: '/mcp-hub', label: 'Open MCP Hub' };
  if (resource.kind === 'voice') return { href: '/voice-studio', label: 'Open Voice Operations' };
  if (resource.kind === 'image' || resource.kind === 'video') return { href: '/media-studio', label: 'Open Media Operations' };
  return null;
}

function ResourceCard({ resource, onRun, running, onInstall, installing, onMcp, mcpRunning }) {
  const Icon = resource.providerId === 'palladium-marketplace' ? Store : resourceIcons[resource.kind] ?? Boxes;
  const m = resource.metadata ?? {};
  const workspace = resourceWorkspace(resource);
  const rows = [];
  rows.push(['Hub provider', resource.providerId]);
  if (m.source) rows.push(['Source', m.source]);
  if (m.model || m.modelProvider) rows.push(['Model', [m.modelProvider,m.model].filter(Boolean).join(' / ')]);
  if (resource.kind === 'model' && m.evalCount != null) rows.push(['Arena evaluation', `${m.evalAverageScore ?? '—'}/100 · ${m.evalCount} scored${m.lastEvaluatedAt ? ` · ${new Date(m.lastEvaluatedAt).toLocaleDateString()}` : ''}`]);
  if (resource.kind === 'model' && m.recentRuns != null) rows.push(['Recent usage', `${m.recentRuns} runs · ${m.succeededRuns ?? '0'} ok · ${m.failedRuns ?? '0'} failed`]);
  if (resource.kind === 'model' && (m.tokensIn != null || m.tokensOut != null)) rows.push(['Tokens', `${Number(m.tokensIn ?? 0).toLocaleString()} in · ${Number(m.tokensOut ?? 0).toLocaleString()} out`]);
  if (resource.kind === 'model' && m.costPence != null) rows.push(['Recent cost', `£${(Number(m.costPence)/100).toFixed(2)}${m.lastUsedAt ? ` · last used ${new Date(m.lastUsedAt).toLocaleDateString()}` : ''}`]);
  if (resource.kind === 'voice' && (m.ttsModel || m.sttModel)) rows.push(['Voice models', [m.ttsModel,m.sttModel].filter(Boolean).join(' / ')]);
  if (resource.kind === 'voice' && (m.voiceCount || m.formats)) rows.push(['Voice output', `${m.voiceCount ? `${m.voiceCount} voices` : ''}${m.voiceCount && m.formats ? ' · ' : ''}${m.formats || ''}`]);
  if (resource.kind === 'voice' && (m.outputSampleRateHz || m.localFirst)) rows.push(['Voice runtime', `${m.outputSampleRateHz ? `${m.outputSampleRateHz} Hz` : ''}${m.outputSampleRateHz && m.localFirst ? ' · ' : ''}${m.localFirst === 'true' ? 'local-first' : ''}`]);
  if ((resource.kind === 'image' || resource.kind === 'video') && m.workflows) rows.push(['Media workflows', m.workflows]);
  if ((resource.kind === 'image' || resource.kind === 'video') && m.aspectRatios) rows.push(['Aspect ratios', m.aspectRatios]);
  if (resource.kind === 'video' && m.durationSeconds) rows.push(['Durations', `${m.durationSeconds}s`]);
  if (resource.kind === 'video' && (m.modes || m.exports)) rows.push(['Editing', [m.modes,m.exports].filter(Boolean).join(' / ')]);
  if (m.area || m.access) rows.push(['MCP access', [m.area,m.access].filter(Boolean).join(' / ')]);
  if (m.requiresApproval) rows.push(['Approval required', m.requiresApproval === 'true' ? 'Yes' : 'No']);
  if (m.sourceStatus) rows.push(['App lifecycle', `${m.sourceStatus} / ${m.repositoryStatus} / ${m.sandboxStatus}`]);
  if (m.deploymentStatus || m.productionStatus) rows.push(['Deployment', [m.deploymentStatus,m.productionStatus].filter(Boolean).join(' / ')]);
  if (m.fieldCount) rows.push(['Dataset schema', `${m.fieldCount} fields${m.defaultView ? ` · ${m.defaultView}` : ''}`]);
  if (m.fieldTypes) rows.push(['Field types', m.fieldTypes]);
  if ((m.provider || m.resourceKind) && resource.kind === 'compute') rows.push(['Compute target', [m.provider,m.resourceKind].filter(Boolean).join(' / ')]);
  if (m.category) rows.push(['Category', m.category]);
  if (m.pricePence != null) rows.push(['Marketplace price', `${m.currency === 'GBP' ? '£' : `${m.currency || ''} `}${(Number(m.pricePence)/100).toFixed(2)}`]);
  if (m.rating != null || m.installCount != null) rows.push(['Marketplace activity', [m.rating != null ? `${m.rating}★` : null,m.installCount != null ? `${m.installCount} installs` : null].filter(Boolean).join(' · ')]);
  if (m.version) rows.push(['Version', m.version]);

  const violetAction = 'mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-violet-300/20 bg-violet-400/[.07] px-3 py-2 text-xs font-medium text-violet-100 transition hover:bg-violet-400/[.12] disabled:cursor-not-allowed disabled:opacity-50';
  return <div className="group relative overflow-hidden rounded-2xl border border-violet-300/10 bg-[linear-gradient(145deg,rgba(14,11,20,.9),rgba(6,6,10,.95))] p-4 shadow-[0_18px_60px_rgba(0,0,0,.2)] transition hover:border-violet-300/20">
    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/20 to-transparent" />
    <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-300/15 bg-violet-400/[.07]"><Icon className="h-4 w-4 text-violet-300" /></div><div className="min-w-0"><h3 className="truncate text-sm font-semibold text-white">{resource.name}</h3><p className="mt-0.5 truncate text-[10px] uppercase tracking-[.16em] text-zinc-500">{resource.providerId === 'palladium-marketplace' ? 'marketplace agent' : resource.kind} · intelligence node</p></div></div><span className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium ${statusClasses(resource.status)}`}>{resource.status}</span></div>
    <div className="mt-4 space-y-2 text-xs text-zinc-400">{rows.map(([label,value]) => <div key={label} className="flex items-center justify-between gap-3"><span className="text-zinc-500">{label}</span><span className="truncate text-right text-zinc-300">{value}</span></div>)}</div>
    {resource.capabilities?.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{resource.capabilities.slice(0,6).map((capability) => <span key={capability} className="rounded-md border border-violet-300/10 bg-violet-400/[.025] px-2 py-1 text-[11px] text-zinc-300">{capability}</span>)}{resource.capabilities.length > 6 && <span className="rounded-md border border-violet-300/10 bg-violet-400/[.025] px-2 py-1 text-[11px] text-zinc-500">+{resource.capabilities.length-6}</span>}</div>}
    {(resource.kind === 'workflow' || resource.kind === 'agent') && <button type="button" onClick={() => onRun(resource)} disabled={running || resource.status !== 'active'} className={violetAction}><Play className="h-3.5 w-3.5" />{running ? 'Executing…' : resource.kind === 'agent' ? 'Execute agent with approval' : 'Execute workflow with approval'}</button>}
    {resource.providerId === 'palladium-marketplace' && <button type="button" onClick={() => onInstall(resource)} disabled={installing || resource.status !== 'published'} className={violetAction}><Bot className="h-3.5 w-3.5" />{installing ? 'Installing…' : 'Install to agent network'}</button>}
    {resource.providerId === 'palladium-smart-tables' && <a href="/smart-tables" className={violetAction}><Database className="h-3.5 w-3.5" />Open Smart Tables</a>}
    {workspace && <a href={workspace.href} className={violetAction}><Play className="h-3.5 w-3.5" />{workspace.label}</a>}
    {resource.kind === 'tool' && resource.providerId.startsWith('external-mcp:') && <button type="button" onClick={() => onMcp(resource)} disabled={mcpRunning || resource.status !== 'available'} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs font-medium text-amber-100 transition hover:bg-amber-400/15 disabled:opacity-50"><Network className="h-3.5 w-3.5" />{mcpRunning ? 'Preparing…' : 'Execute MCP tool'}</button>}
  </div>;
}

export default function AIHub() {
  const providers = createPalladiumAiHubRegistry().listProviders();
  const session = useSessionReady();
  const listResources = useServerFn(listAiHubResources);
  const runHubWorkflow = useServerFn(executeAiHubWorkflow);
  const runHubAgent = useServerFn(executeAiHubAgent);
  const runHubMcp = useServerFn(executeAiHubExternalMcp);
  const installAgent = useServerFn(installMarketplaceAgent);
  const [query,setQuery] = useState(''); const [kind,setKind] = useState('all'); const [goal,setGoal] = useState(''); const [approval,setApproval] = useState(null); const [selectedMcp,setSelectedMcp] = useState(null); const [mcpInput,setMcpInput] = useState('{}'); const [mcpApproval,setMcpApproval] = useState(null);
  const execution = useMutation({ mutationFn: ({resource,approvalRequestId}) => { const invoke = resource.kind === 'agent' ? runHubAgent : runHubWorkflow; return invoke({ data: { resourceId:resource.id, goal, ...(approvalRequestId ? {approvalRequestId}: {}) } }); }, onSuccess: (result,variables) => { if (result.status === 'waiting_for_approval') setApproval({resource:variables.resource,approvalRequestId:result.approvalRequestId}); else setApproval(null); } });
  const startWorkflow = (resource) => { if (!goal.trim()) return; execution.mutate({resource}); };
  const installation = useMutation({ mutationFn:(resource) => installAgent({data:{item_id:resource.id}}), onSuccess:() => inventory.refetch() });
  const mcpExecution = useMutation({ mutationFn:({resource,approvalRequestId}) => runHubMcp({data:{resourceId:resource.id,inputJson:mcpInput,...(approvalRequestId ? {approvalRequestId}:{})}}), onSuccess:(result,variables) => { if(result.status === 'waiting_for_approval') setMcpApproval({resource:variables.resource,approvalRequestId:result.approvalRequestId}); else setMcpApproval(null); } });
  const inventory = useQuery({ queryKey:['ai-hub-live-resources'], queryFn:() => listResources({data:{limit:100}}), enabled:session === 'yes', retry:false, refetchInterval:15000 });
  const filteredResources = useMemo(() => { const resources=inventory.data?.resources ?? []; const needle=query.trim().toLowerCase(); return resources.filter((resource) => { if(kind==='marketplace' && resource.providerId!=='palladium-marketplace') return false; if(kind!=='all' && kind!=='marketplace' && resource.kind!==kind) return false; if(!needle) return true; const searchable=[resource.name,resource.kind,resource.status,resource.providerId,...Object.values(resource.metadata ?? {}),...(resource.capabilities ?? [])].filter(Boolean).join(' ').toLowerCase(); return searchable.includes(needle); }); },[inventory.data?.resources,kind,query]);
  const liveKindCount = (value) => { if(!inventory.data) return ''; if(value==='marketplace') return ` (${inventory.data.counts.marketplace})`; if(['voice','image','video'].includes(value)) return ` (${inventory.data.resources.filter((resource)=>resource.kind===value).length})`; const countKey={model:'models',agent:'agents',app:'apps',dataset:'datasets',compute:'compute',tool:'tools',mcp:'mcp',workflow:'workflows'}[value]; return countKey ? ` (${inventory.data.counts[countKey]})` : ''; };

  return <>
    <PageHeader eyebrow="Blackstar Intelligence Hub" title="Universal AI Hub" description="Discover, route, govern and execute Blackstar intelligence capabilities through one live control surface while every underlying runtime remains authoritative." />
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="grid gap-3 md:grid-cols-3"><HubMetric label="Native systems" value={providers.length} detail="Existing intelligence subsystems registered behind one canonical Hub contract." /><HubMetric label="Live resources" value={inventory.data?.counts.total ?? '—'} detail="Models, agents, media, MCP, skills, apps, datasets, compute and workflows." /><HubMetric label="Routing + policy" value="Capability-aware" detail="Actor-scoped discovery with protected approval and runtime policy enforcement." /></div>
      <section className="relative overflow-hidden rounded-[26px] border border-violet-300/10 bg-black/35 p-5 shadow-[0_24px_80px_rgba(0,0,0,.24)] backdrop-blur-xl"><div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/25 to-transparent" />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[9px] font-semibold uppercase tracking-[.24em] text-violet-300/60">Live intelligence inventory</p><h2 className="mt-1 text-lg font-semibold text-white">Capability network</h2><p className="mt-1 text-sm text-zinc-500">Authenticated resources discovered through Blackstar's canonical Hub boundary while each subsystem remains its system of record.</p></div><div className="relative w-full lg:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" /><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search intelligence resources…" className="w-full rounded-xl border border-violet-300/10 bg-black/30 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-300/30" /></div></div>
        <div className="mt-4 flex flex-wrap gap-2">{FILTERS.map(([value,label]) => <button key={value} type="button" onClick={()=>setKind(value)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${kind===value ? 'border-violet-300/25 bg-violet-400/[.09] text-violet-100':'border-violet-300/[.08] bg-white/[.02] text-zinc-500 hover:border-violet-300/15 hover:text-zinc-300'}`}>{label}{value!=='all' ? liveKindCount(value):''}</button>)}</div>
        <div className="mt-4 rounded-2xl border border-violet-300/15 bg-violet-400/[.035] p-4"><label className="text-xs font-semibold uppercase tracking-[.16em] text-violet-200">Execution objective</label><textarea value={goal} onChange={(e)=>setGoal(e.target.value)} rows={3} maxLength={8000} placeholder="Describe what the selected agent or workflow should accomplish…" className="mt-2 w-full resize-y rounded-xl border border-violet-300/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-300/30" /><p className="mt-2 text-xs text-zinc-500">Agent and workflow execution creates an approval request before the existing protected runtime can start.</p></div>
        {approval && <ApprovalBox approval={approval} pending={execution.isPending} resume={() => execution.mutate(approval)} label="run" />}
        {execution.isError && <div className="mt-4"><Failed message={friendlyMessage(execution.error)} /></div>}{execution.isSuccess && execution.data?.status==='completed' && <Success>Hub action completed through the protected Blackstar runtime.</Success>}
        {installation.isError && <div className="mt-4"><Failed message={friendlyMessage(installation.error)} /></div>}{installation.isSuccess && <Success>Marketplace agent installed to your agent network.</Success>}
        {selectedMcp && <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/[.07] p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-amber-100">MCP tool · {selectedMcp.name}</p><button type="button" onClick={()=>{setSelectedMcp(null);setMcpApproval(null);}} className="text-xs text-amber-200/70">Close</button></div><p className="mt-1 text-xs text-amber-200/70">Provide tool arguments as a JSON object. This protected action always requires approval.</p><textarea value={mcpInput} onChange={(e)=>setMcpInput(e.target.value)} rows={5} maxLength={20000} className="mt-3 w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 font-mono text-xs text-white outline-none focus:border-amber-400/40" /><button type="button" disabled={mcpExecution.isPending} onClick={()=>mcpExecution.mutate({resource:selectedMcp})} className="mt-3 rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs font-medium text-amber-100 disabled:opacity-50">Request execution approval</button></div>}
        {mcpApproval && <ApprovalBox approval={mcpApproval} pending={mcpExecution.isPending} resume={()=>mcpExecution.mutate(mcpApproval)} label="tool" />}{mcpExecution.isError && <div className="mt-4"><Failed message={friendlyMessage(mcpExecution.error)} /></div>}{mcpExecution.isSuccess && mcpExecution.data?.status==='completed' && <Success>MCP tool completed through its configured protected bridge.</Success>}
        <div className="mt-5">{session==='no' && <Failed message="Sign in to inspect your live AI Hub resources." />}{session==='yes' && inventory.isLoading && <Loading label="Loading intelligence resources…" />}{inventory.isError && <Failed message={friendlyMessage(inventory.error)} onRetry={()=>inventory.refetch()} />}{inventory.isSuccess && filteredResources.length>0 && <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{filteredResources.map((resource)=><ResourceCard key={`${resource.kind}:${resource.providerId}:${resource.id}`} resource={resource} onRun={startWorkflow} running={execution.isPending && execution.variables?.resource?.id===resource.id} onInstall={(item)=>installation.mutate(item)} installing={installation.isPending && installation.variables?.id===resource.id} onMcp={(tool)=>{setSelectedMcp(tool);setMcpInput('{}');setMcpApproval(null);}} mcpRunning={mcpExecution.isPending && mcpExecution.variables?.resource?.id===resource.id} />)}</div>}{inventory.isSuccess && filteredResources.length===0 && <div className="rounded-xl border border-dashed border-violet-300/10 bg-black/10 px-4 py-8 text-center text-sm text-zinc-500">{inventory.data.resources.length===0 ? 'No Hub resources are available yet.' : 'No resources match the current search and filter.'}</div>}</div>
      </section>
      <section className="relative overflow-hidden rounded-[26px] border border-violet-300/10 bg-black/35 p-5 backdrop-blur-xl"><div className="mb-4"><p className="text-[9px] font-semibold uppercase tracking-[.24em] text-violet-300/60">Canonical registry</p><h2 className="mt-1 text-lg font-semibold text-white">Connected Blackstar systems</h2><p className="mt-1 text-sm text-zinc-500">One registry over the existing model, agent, MCP, workflow, app, data, compute and media systems—never a duplicate execution layer.</p></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{providers.map((provider)=>{const Icon=icons[provider.adapter]??Boxes;return <div key={provider.id} className="rounded-2xl border border-violet-300/10 bg-black/25 p-4"><div className="flex items-start justify-between gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-300/15 bg-violet-400/[.07]"><Icon className="h-4 w-4 text-violet-300" /></div><span className="rounded-full border border-emerald-400/20 bg-emerald-400/[.08] px-2 py-1 text-[11px] font-medium text-emerald-300">{provider.enabled?'Enabled':'Disabled'}</span></div><h3 className="mt-4 text-sm font-semibold text-white">{provider.name}</h3><p className="mt-1 text-xs text-zinc-500">Adapter: {provider.adapter}</p><div className="mt-3 flex flex-wrap gap-1.5">{provider.capabilityKinds.map((cap)=><span key={cap} className="rounded-md border border-violet-300/10 bg-violet-400/[.025] px-2 py-1 text-[11px] text-zinc-300">{cap}</span>)}</div><p className="mt-3 text-xs leading-5 text-zinc-500">Deploy: {provider.deploymentTargets.join(', ')}</p></div>;})}</div></section>
    </div>
  </>;
}
function HubMetric({label,value,detail}) { return <div className="relative overflow-hidden rounded-2xl border border-violet-300/10 bg-black/35 p-5 backdrop-blur-xl"><div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/20 to-transparent" /><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-zinc-500">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</p><p className="mt-2 text-sm leading-5 text-zinc-500">{detail}</p></div>; }
function Success({children}) { return <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/[.07] p-4 text-sm text-emerald-200">{children}</div>; }
function ApprovalBox({approval,pending,resume,label}) { return <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/[.07] p-4 text-sm text-amber-100"><p className="font-medium">Approval required · {approval.resource.name}</p><p className="mt-1 text-xs text-amber-200/70">Approve request {approval.approvalRequestId} in Mission Control, then resume execution here.</p><div className="mt-3 flex flex-wrap gap-2"><a href="/mission-control" className="rounded-lg border border-amber-300/25 px-3 py-2 text-xs font-medium hover:bg-amber-300/10">Open Mission Control</a><button type="button" disabled={pending} onClick={resume} className="rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-xs font-medium text-emerald-100 disabled:opacity-50">Resume approved {label}</button></div></div>; }
