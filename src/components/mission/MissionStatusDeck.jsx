import { useEffect, useMemo, useState } from 'react';
import { Activity, Bell, Bot, Radio, ShieldAlert, Wifi } from 'lucide-react';

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(timer); }, []);
  return <span className="font-mono text-sm font-semibold tracking-wider text-white">{now.toLocaleTimeString('en-GB', { hour12: false })}</span>;
}

export default function MissionStatusDeck({ metrics = {}, pendingCount = 0, loading = false, lastSync }) {
  const operations = Number(metrics.runningTasks || 0) + Number(metrics.runningWorkforceRuns || 0);
  const exceptions = Number(metrics.failedTasks || 0);
  const health = useMemo(() => exceptions > 0 ? 'Attention' : pendingCount > 0 ? 'Decisions pending' : operations > 0 ? 'Operations active' : 'Standing by', [exceptions, pendingCount, operations]);
  const cells = [
    { label: 'Agent mesh', value: metrics.activeAgents ?? 0, icon: Bot, tone: 'text-violet-200' },
    { label: 'In flight', value: operations, icon: Activity, tone: 'text-emerald-200' },
    { label: 'Approval gates', value: pendingCount, icon: ShieldAlert, tone: pendingCount ? 'text-amber-200' : 'text-zinc-300' },
    { label: 'Signals', value: metrics.unreadNotifications ?? 0, icon: Bell, tone: Number(metrics.unreadNotifications || 0) ? 'text-amber-200' : 'text-zinc-300' },
  ];
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/45 px-3 py-3 backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/35 to-transparent" />
      <div className="grid gap-2 md:grid-cols-[1.25fr_repeat(4,1fr)_1.1fr]">
        <div className="flex min-h-14 items-center gap-3 rounded-xl border border-white/8 bg-white/[.025] px-3"><span className={`h-2 w-2 rounded-full ${exceptions ? 'bg-rose-300' : operations ? 'bg-emerald-300 animate-pulse' : 'bg-zinc-500'}`} /><div><p className="text-[8px] uppercase tracking-[.22em] text-zinc-600">Operational state</p><p className="mt-0.5 text-xs font-semibold text-white">{loading ? 'Synchronising' : health}</p></div></div>
        {cells.map(({ label, value, icon: Icon, tone }) => <div key={label} className="flex min-h-14 items-center gap-2.5 rounded-xl border border-white/8 bg-white/[.02] px-3"><Icon className={`h-3.5 w-3.5 ${tone}`} /><div><p className="text-[8px] uppercase tracking-[.18em] text-zinc-600">{label}</p><p className="mt-0.5 text-sm font-semibold text-white">{loading ? '—' : value}</p></div></div>)}
        <div className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-emerald-300/10 bg-emerald-300/[.025] px-3"><div><p className="flex items-center gap-1 text-[8px] uppercase tracking-[.18em] text-emerald-300/70"><Radio className="h-2.5 w-2.5" />Realtime link</p><Clock /></div><div className="text-right"><Wifi className="ml-auto h-3.5 w-3.5 text-emerald-300" /><p className="mt-1 text-[8px] text-zinc-600">{lastSync ? `sync ${new Date(lastSync).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'live data'}</p></div></div>
      </div>
    </section>
  );
}
