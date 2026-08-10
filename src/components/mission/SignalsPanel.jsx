import { Bell, BellOff, Activity, Coins, Cpu, CheckCheck } from 'lucide-react';

const METRIC_LABEL = {
  agent_run: 'Agent runs',
  tool_execution: 'Tool executions',
  tokens: 'Tokens',
  memory_write: 'Memory writes',
  browser_session: 'Browser sessions',
};

const fmt = (n) => new Intl.NumberFormat('en-GB').format(Number(n ?? 0));

export default function SignalsPanel({ notifications = [], usage, loading, onRead, onReadAll }) {
  const unread = notifications.filter((n) => !n.read_at).length;
  const metrics = Object.entries(usage?.byMetric ?? {});

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <div className="mb-3 flex items-center gap-2">
          <Bell className="h-4 w-4 text-amber-300" />
          <h2 className="text-sm font-semibold text-white">Notifications</h2>
          {unread > 0 && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-200">{unread} unread</span>}
          {unread > 0 && (
            <button onClick={() => onReadAll?.()} className="ml-auto inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-[10px] text-zinc-300 hover:bg-white/5">
              <CheckCheck className="h-3 w-3" />Mark all read
            </button>
          )}
        </div>

        {loading && <p className="text-xs text-zinc-600">Loading…</p>}
        {!loading && notifications.length === 0 && (
          <p className="flex items-center gap-2 text-xs text-zinc-600"><BellOff className="h-3.5 w-3.5" />Nothing to report yet.</p>
        )}

        <ul className="space-y-2">
          {notifications.map((n) => (
            <li key={n.id} className={`rounded-xl border p-3 ${n.read_at ? 'border-white/5 bg-black/20' : 'border-amber-400/25 bg-amber-500/[.06]'}`}>
              <div className="flex items-start gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-white">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-[11px] text-zinc-400">{n.body}</p>}
                  <p className="mt-1 text-[10px] text-zinc-600">
                    {String(n.kind ?? '').replace(/_/g, ' ')} · {new Date(n.created_at).toLocaleString('en-GB')}
                  </p>
                </div>
                {!n.read_at && (
                  <button onClick={() => onRead?.(n)} className="ml-auto shrink-0 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-zinc-300 hover:bg-white/5">
                    Mark read
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <div className="mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-white">Usage this month</h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Stat icon={Cpu} label="Agent runs" value={fmt(usage?.agentRuns)} sub={`${fmt(usage?.succeededRuns)} succeeded · ${fmt(usage?.failedRuns)} failed`} />
          <Stat icon={Coins} label="Model spend" value={`£${((Number(usage?.costPence ?? 0)) / 100).toFixed(2)}`} sub="metered by the runtime" />
          <Stat icon={Activity} label="Tokens in" value={fmt(usage?.tokensIn)} />
          <Stat icon={Activity} label="Tokens out" value={fmt(usage?.tokensOut)} />
        </div>

        <div className="mt-4 space-y-1.5">
          {metrics.length === 0 && <p className="text-[11px] text-zinc-600">No metered usage recorded yet this month.</p>}
          {metrics.map(([metric, qty]) => (
            <div key={metric} className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-[11px]">
              <span className="text-zinc-400">{METRIC_LABEL[metric] ?? metric.replace(/_/g, ' ')}</span>
              <span className="font-medium text-white">{fmt(qty)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 p-3">
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500"><Icon className="h-3 w-3" />{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
      {sub && <p className="text-[10px] text-zinc-600">{sub}</p>}
    </div>
  );
}
