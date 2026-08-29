import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { BarChart3, FlaskConical, Loader2, Plus, Route, Send } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { useSessionReady } from '@/lib/useSessionReady';
import { friendlyMessage } from '@/lib/errors';
import { useToast } from '@/components/ui/use-toast';
import { Stat, Tabs, Empty, Failed, Table, formatNumber } from '@/components/business/live';
import {
  createProductAnalyticsProject,
  createProductExperiment,
  createProductFunnel,
  getProductAnalyticsOverview,
  listProductAnalyticsProjects,
  recordProductAnalyticsEvent,
} from '@/lib/analytics/product-analytics.functions';

const RANGES = [{ id: '7d', label: '7 days' }, { id: '30d', label: '30 days' }, { id: '90d', label: '90 days' }];

export default function ProductAnalytics() {
  const session = useSessionReady();
  const qc = useQueryClient();
  const { toast } = useToast();
  const listFn = useServerFn(listProductAnalyticsProjects);
  const createProjectFn = useServerFn(createProductAnalyticsProject);
  const overviewFn = useServerFn(getProductAnalyticsOverview);
  const eventFn = useServerFn(recordProductAnalyticsEvent);
  const funnelFn = useServerFn(createProductFunnel);
  const experimentFn = useServerFn(createProductExperiment);
  const [projectId, setProjectId] = useState('');
  const [range, setRange] = useState('30d');
  const [projectName, setProjectName] = useState('');
  const [domain, setDomain] = useState('');
  const [eventName, setEventName] = useState('page_view');
  const [visitorId, setVisitorId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [revenue, setRevenue] = useState('0');
  const [funnelName, setFunnelName] = useState('Activation funnel');
  const [funnelSteps, setFunnelSteps] = useState('page_view,signup,purchase');
  const [experimentName, setExperimentName] = useState('Homepage experiment');
  const [goalEvent, setGoalEvent] = useState('signup');
  const [variants, setVariants] = useState('control,variant-a');

  const projects = useQuery({ queryKey: ['product-analytics-projects'], queryFn: () => listFn(), enabled: session === 'yes', retry: false });
  useEffect(() => { if (!projectId && projects.data?.[0]?.id) setProjectId(projects.data[0].id); }, [projectId, projects.data]);
  const overview = useQuery({ queryKey: ['product-analytics-overview', projectId, range], queryFn: () => overviewFn({ data: { projectId, range } }), enabled: session === 'yes' && Boolean(projectId), retry: false });
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ['product-analytics-projects'] }), qc.invalidateQueries({ queryKey: ['product-analytics-overview'] })]);

  const createProject = useMutation({ mutationFn: () => createProjectFn({ data: { name: projectName, domain: domain || null, currency: 'GBP' } }), onSuccess: async (row) => { setProjectName(''); setDomain(''); setProjectId(row.id); await refresh(); toast({ title: 'Analytics project created' }); }, onError: (error) => toast({ variant: 'destructive', title: 'Could not create project', description: friendlyMessage(error) }) });
  const recordEvent = useMutation({ mutationFn: () => eventFn({ data: { projectId, eventName, visitorId: visitorId || null, sessionId: sessionId || null, revenueCents: Math.max(0, Math.round(Number(revenue || 0) * 100),), properties: {} } }), onSuccess: async () => { await refresh(); toast({ title: 'Event recorded' }); }, onError: (error) => toast({ variant: 'destructive', title: 'Could not record event', description: friendlyMessage(error) }) });
  const createFunnel = useMutation({ mutationFn: () => funnelFn({ data: { projectId, name: funnelName, steps: funnelSteps.split(',').map((value) => value.trim()).filter(Boolean) } }), onSuccess: async () => { await refresh(); toast({ title: 'Funnel saved' }); }, onError: (error) => toast({ variant: 'destructive', title: 'Could not save funnel', description: friendlyMessage(error) }) });
  const createExperiment = useMutation({ mutationFn: () => experimentFn({ data: { projectId, name: experimentName, goalEvent, variants: variants.split(',').map((value) => value.trim()).filter(Boolean) } }), onSuccess: async () => { await refresh(); toast({ title: 'Experiment saved' }); }, onError: (error) => toast({ variant: 'destructive', title: 'Could not save experiment', description: friendlyMessage(error) }) });

  const selected = projects.data?.find((project) => project.id === projectId);
  const totals = overview.data?.totals;

  return <>
    <PageHeader eyebrow="Business" title="Product Analytics" description="Privacy-first product, funnel, experiment and revenue analytics inspired by Talivia and OpenPanel, implemented natively on PalladiumAI auth and RLS." action={<Tabs tabs={RANGES} active={range} onChange={setRange} />} />
    {session === 'no' && <Failed message="Sign in to use Product Analytics." />}
    {projects.error && <Failed message={friendlyMessage(projects.error)} />}

    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
          <div className="flex flex-wrap items-center gap-2">
            <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="min-w-64 rounded-xl border border-white/10 bg-[#11131a] px-3 py-2 text-sm text-white">
              <option value="">Select analytics project</option>{(projects.data ?? []).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
            {selected && <span className="text-xs text-zinc-500">{selected.domain || 'No domain'} · {selected.currency}</span>}
          </div>
          {selected && <div className="mt-3 rounded-xl border border-violet-400/15 bg-violet-400/[.04] p-3"><p className="text-[10px] uppercase tracking-wide text-zinc-500">Project write key</p><code className="mt-1 block break-all text-xs text-violet-200">{selected.write_key}</code><p className="mt-1 text-[11px] text-zinc-500">Use this key when wiring a server-side or SDK ingestion adapter. The current workspace recorder is authenticated; PalladiumAI does not expose an unauthenticated tracking endpoint by default.</p></div>}
        </div>

        {overview.isFetching && <div className="flex items-center gap-2 text-xs text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" />Aggregating product events…</div>}
        {overview.error && <Failed message={friendlyMessage(overview.error)} />}
        {overview.data && <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Events" value={formatNumber(totals.events)} /><Stat label="Visitors" value={formatNumber(totals.visitors)} /><Stat label="Sessions" value={formatNumber(totals.sessions)} /><Stat label="Revenue" value={`£${(totals.revenueCents / 100).toFixed(2)}`} /></div>
          <div className="grid gap-4 xl:grid-cols-2">
            <section className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><h2 className="text-sm font-semibold text-white">Top events</h2><div className="mt-3"><Table columns={['Event','Count']} rows={overview.data.topEvents} empty={<Empty icon={BarChart3} title="No events yet" desc="Record or ingest your first product event." />} renderRow={(row) => <tr key={row.name} className="border-b border-white/5"><td className="px-4 py-3 text-white">{row.name}</td><td className="px-4 py-3 text-zinc-300">{formatNumber(row.count)}</td></tr>} /></div></section>
            <section className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><h2 className="text-sm font-semibold text-white">Recent event stream</h2><div className="mt-3 max-h-72 space-y-2 overflow-auto">{overview.data.recentEvents.length === 0 ? <Empty title="No event history" desc="Events appear here with visitor, session and revenue context." /> : overview.data.recentEvents.slice(0, 20).map((event) => <div key={event.id} className="rounded-xl border border-white/5 bg-black/20 p-3"><div className="flex justify-between gap-2"><span className="text-xs font-medium text-white">{event.event_name}</span><span className="text-[10px] text-zinc-600">{new Date(event.occurred_at).toLocaleString()}</span></div><p className="mt-1 text-[11px] text-zinc-500">{event.path || 'No path'}{Number(event.revenue_cents) > 0 ? ` · £${(Number(event.revenue_cents) / 100).toFixed(2)}` : ''}</p></div>)}</div></section>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <section className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="flex items-center gap-2"><Route className="h-4 w-4 text-violet-300" /><h2 className="text-sm font-semibold text-white">Funnels</h2></div><div className="mt-3 space-y-2">{overview.data.funnels.length === 0 ? <p className="text-xs text-zinc-500">No funnels configured.</p> : overview.data.funnels.map((funnel) => <div key={funnel.id} className="rounded-xl border border-white/5 p-3"><p className="text-xs text-white">{funnel.name}</p><p className="mt-1 text-[11px] text-zinc-500">{Array.isArray(funnel.steps) ? funnel.steps.join(' → ') : 'Configured funnel'}</p></div>)}</div></section>
            <section className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="flex items-center gap-2"><FlaskConical className="h-4 w-4 text-violet-300" /><h2 className="text-sm font-semibold text-white">Experiments</h2></div><div className="mt-3 space-y-2">{overview.data.experiments.length === 0 ? <p className="text-xs text-zinc-500">No experiments configured.</p> : overview.data.experiments.map((experiment) => <div key={experiment.id} className="rounded-xl border border-white/5 p-3"><div className="flex justify-between"><p className="text-xs text-white">{experiment.name}</p><span className="text-[10px] uppercase text-zinc-500">{experiment.status}</span></div><p className="mt-1 text-[11px] text-zinc-500">Goal: {experiment.goal_event}</p></div>)}</div></section>
          </div>
        </>}
      </div>

      <aside className="space-y-4">
        <Panel title="New analytics project" icon={Plus}><Field value={projectName} setValue={setProjectName} placeholder="Storefront" /><Field value={domain} setValue={setDomain} placeholder="example.com" /><Action pending={createProject.isPending} disabled={!projectName.trim()} onClick={() => createProject.mutate()}>Create project</Action></Panel>
        <Panel title="Record test/server event" icon={Send}><Field value={eventName} setValue={setEventName} placeholder="page_view" /><Field value={visitorId} setValue={setVisitorId} placeholder="Visitor ID (optional)" /><Field value={sessionId} setValue={setSessionId} placeholder="Session ID (optional)" /><Field value={revenue} setValue={setRevenue} placeholder="Revenue in GBP" type="number" /><Action pending={recordEvent.isPending} disabled={!projectId || !eventName.trim()} onClick={() => recordEvent.mutate()}>Record event</Action></Panel>
        <Panel title="Create funnel" icon={Route}><Field value={funnelName} setValue={setFunnelName} /><Field value={funnelSteps} setValue={setFunnelSteps} placeholder="view,signup,purchase" /><Action pending={createFunnel.isPending} disabled={!projectId || funnelSteps.split(',').filter(Boolean).length < 2} onClick={() => createFunnel.mutate()}>Save funnel</Action></Panel>
        <Panel title="Create experiment" icon={FlaskConical}><Field value={experimentName} setValue={setExperimentName} /><Field value={goalEvent} setValue={setGoalEvent} placeholder="Goal event" /><Field value={variants} setValue={setVariants} placeholder="control,variant-a" /><Action pending={createExperiment.isPending} disabled={!projectId || !goalEvent.trim()} onClick={() => createExperiment.mutate()}>Save experiment</Action></Panel>
      </aside>
    </div>
  </>;
}

function Panel({ title, icon: Icon, children }) { return <section className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="mb-3 flex items-center gap-2"><Icon className="h-4 w-4 text-violet-300" /><h3 className="text-sm font-semibold text-white">{title}</h3></div><div className="space-y-2">{children}</div></section>; }
function Field({ value, setValue, placeholder = '', type = 'text' }) { return <input type={type} value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-violet-400/40" />; }
function Action({ pending, disabled, onClick, children }) { return <button disabled={disabled || pending} onClick={onClick} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-40">{pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{children}</button>; }
