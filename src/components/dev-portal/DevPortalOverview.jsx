import { ArrowUpRight, Activity, TrendingUp, Clock, AlertTriangle } from 'lucide-react';

const STATS = [
  { label: 'Total requests', value: '184,320', delta: '+12%', icon: Activity, tone: 'from-violet-600/40 to-indigo-600/40' },
  { label: 'Success rate', value: '99.8%', delta: '+0.2%', icon: TrendingUp, tone: 'from-emerald-600/40 to-teal-600/40' },
  { label: 'Avg latency', value: '142ms', delta: '-8ms', icon: Clock, tone: 'from-sky-600/40 to-blue-600/40' },
  { label: 'Error rate', value: '0.02%', delta: '-23%', icon: AlertTriangle, tone: 'from-amber-600/40 to-orange-600/40' },
];

export default function DevPortalOverview({ onNav }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Developer Portal</h2>
        <p className="text-sm text-zinc-400">Build on the PalladiumAI platform — keys, docs, an API explorer, webhooks, and SDKs.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s) => { const I = s.icon; return (
          <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] px-4 py-3">
            <span className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${s.tone}`}><I className="h-5 w-5 text-white" /></span>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">{s.label}</p>
              <p className="text-lg font-semibold text-white">{s.value}</p>
              <p className="text-[10px] text-emerald-400">{s.delta}</p>
            </div>
          </div>
        ); })}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
          <h3 className="text-sm font-semibold text-white">Quickstart</h3>
          <ol className="mt-3 space-y-2.5 text-[12px] text-zinc-300">
            {[['Create an API key', 'api-keys'], ['Send your first request', 'explorer'], ['Subscribe to webhooks', 'webhooks'], ['Install an SDK', 'sdks']].map(([label, id]) => (
              <li key={id}>
                <button onClick={() => onNav(id)} className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left hover:bg-white/5">
                  <span>{label}</span><ArrowUpRight className="h-3.5 w-3.5 text-zinc-500" />
                </button>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
          <h3 className="text-sm font-semibold text-white">Recent activity</h3>
          <div className="mt-3 space-y-2 text-[11px]">
            <div className="flex justify-between"><span className="text-zinc-300">Key rotated</span><span className="text-zinc-500">2m ago</span></div>
            <div className="flex justify-between"><span className="text-zinc-300">Webhook delivered</span><span className="text-zinc-500">11m ago</span></div>
            <div className="flex justify-between"><span className="text-zinc-300">New SDK version</span><span className="text-zinc-500">1h ago</span></div>
            <div className="flex justify-between"><span className="text-zinc-300">Rate limit warning</span><span className="text-zinc-500">3h ago</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}