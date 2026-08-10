import { useMemo, useState } from 'react';
import { Lock, Info, Server, ShieldCheck, RefreshCw } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import ServiceCard from '@/components/admin-monitoring/ServiceCard';
import MetricCard from '@/components/admin-monitoring/MetricCard';
import IncidentsPanel from '@/components/admin-monitoring/IncidentsPanel';
import LogsPanel from '@/components/admin-monitoring/LogsPanel';
import { SERVICES, HEALTH, INCIDENTS } from '@/components/admin-monitoring/monitoringData';

export default function SystemMonitoring() {
  const [selected, setSelected] = useState(null);

  const summary = useMemo(() => {
    const counts = { operational: 0, degraded: 0, down: 0 };
    SERVICES.forEach(s => { counts[s.health]++; });
    const overall = counts.down > 0 ? 'down' : counts.degraded > 0 ? 'degraded' : 'operational';
    return { counts, overall };
  }, []);

  const overall = HEALTH[summary.overall];

  return (
    <>
      <PageHeader eyebrow="Admin" title="System Monitoring" description="Real-time health of platform infrastructure and services." action={
        <span className="flex items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[11px] font-medium text-emerald-300"><Lock className="h-3.5 w-3.5" />Admin access verified</span>
      } />
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-400/[.06] px-3 py-2 text-[11px] text-rose-200/90"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><p>Live-style telemetry is illustrative mock data — backend-ready for live monitoring, metrics, and log-streaming APIs.</p></div>

      {/* Overall status banner */}
      <div className="mb-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.03] p-4">
        <div className="flex items-center gap-3">
          <div className={`grid h-12 w-12 place-items-center rounded-2xl ${overall.tone}`}><ShieldCheck className="h-6 w-6" /></div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Platform status</p>
            <p className="text-[15px] font-semibold text-white">{summary.overall === 'operational' ? 'All systems operational' : summary.overall === 'degraded' ? 'Partial degradation' : 'Platform outage'}</p>
          </div>
        </div>
        <div className="hidden items-center gap-4 text-[12px] sm:flex">
          <span className="flex items-center gap-1.5 text-zinc-300"><span className="h-2 w-2 rounded-full bg-emerald-400" />{summary.counts.operational} operational</span>
          <span className="flex items-center gap-1.5 text-zinc-300"><span className="h-2 w-2 rounded-full bg-amber-400" />{summary.counts.degraded} degraded</span>
          <span className="flex items-center gap-1.5 text-zinc-300"><span className="h-2 w-2 rounded-full bg-rose-400" />{summary.counts.down} down</span>
        </div>
      </div>

      {/* Services */}
      <div className="mb-2 flex items-center gap-1.5"><Server className="h-3.5 w-3.5 text-violet-400" /><p className="text-[13px] font-semibold text-white">Services</p><span className="text-[11px] text-zinc-500">({SERVICES.length})</span></div>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
        {SERVICES.map(s => <ServiceCard key={s.id} service={s} onSelect={setSelected} selected={selected} />)}
      </div>

      {/* Metrics */}
      <div className="mb-2 flex items-center gap-1.5"><RefreshCw className="h-3.5 w-3.5 text-violet-400" /><p className="text-[13px] font-semibold text-white">Live metrics</p></div>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {Object.keys({ cpu: 1, memory: 1, requests: 1, latency: 1, errors: 1, queue: 1 }).map(id => <MetricCard key={id} id={id} />)}
      </div>

      {/* Incidents + Logs */}
      <div className="grid gap-4 lg:grid-cols-2">
        <IncidentsPanel incidents={INCIDENTS} />
        <LogsPanel service={selected?.id} />
      </div>
    </>
  );
}