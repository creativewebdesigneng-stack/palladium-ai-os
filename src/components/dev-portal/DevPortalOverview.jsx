import { useEffect, useState } from 'react';
import { ArrowUpRight, Activity, TrendingUp, Clock, AlertTriangle, Loader2, KeyRound, Webhook } from 'lucide-react';
import { getApiUsage, listApiKeys, listWebhooks } from './api';
import { friendlyMessage } from '@/lib/errors';

export default function DevPortalOverview({ onNav }) {
  const [usage, setUsage] = useState(null);
  const [keys, setKeys] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([getApiUsage(), listApiKeys(), listWebhooks()])
      .then(([u, k, w]) => {
        if (cancelled) return;
        setUsage(u);
        setKeys(k?.keys ?? (Array.isArray(k) ? k : []));
        setWebhooks(w?.webhooks ?? (Array.isArray(w) ? w : []));
      })
      .catch((e) => { console.error('[dev-portal]', e); if (!cancelled) setError(friendlyMessage(e, 'Could not load developer portal data.')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const STATS = usage ? [
    { label: 'Total requests (24h)', value: (usage.requests ?? 0).toLocaleString(), delta: `${usage.error_rate ?? 0}% errors`, icon: Activity, tone: 'from-violet-600/40 to-indigo-600/40' },
    { label: 'Success rate', value: `${(100 - (usage.error_rate ?? 0)).toFixed(1)}%`, delta: `${usage.errors ?? 0} errors`, icon: TrendingUp, tone: 'from-emerald-600/40 to-teal-600/40' },
    { label: 'Avg latency', value: `${usage.avg_latency_ms ?? 0}ms`, delta: 'server-measured', icon: Clock, tone: 'from-sky-600/40 to-blue-600/40' },
    { label: 'Error rate', value: `${usage.error_rate ?? 0}%`, delta: `${usage.errors ?? 0} of ${usage.requests ?? 0}`, icon: AlertTriangle, tone: 'from-amber-600/40 to-orange-600/40' },
  ] : [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Developer Portal</h2>
        <p className="text-sm text-zinc-400">Build on the PalladiumAI platform — keys, docs, an API explorer, webhooks, and SDKs.</p>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl border border-white/10 bg-white/[.03]" />)}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-xs text-rose-200">{error}</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s) => { const I = s.icon; return (
            <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] px-4 py-3">
              <span className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${s.tone}`}><I className="h-5 w-5 text-white" /></span>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-zinc-500">{s.label}</p>
                <p className="text-lg font-semibold text-white">{s.value}</p>
                <p className="text-[10px] text-zinc-500">{s.delta}</p>
              </div>
            </div>
          ); })}
        </div>
      )}

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
          <h3 className="text-sm font-semibold text-white">Your resources</h3>
          {loading ? (
            <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading…</div>
          ) : (
            <div className="mt-3 space-y-2 text-[12px]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-zinc-300"><KeyRound className="h-3.5 w-3.5 text-zinc-500" />API keys</span>
                <span className="text-zinc-400">{keys.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-zinc-300"><Webhook className="h-3.5 w-3.5 text-zinc-500" />Webhooks</span>
                <span className="text-zinc-400">{webhooks.length}</span>
              </div>
              {keys.length === 0 && webhooks.length === 0 && (
                <p className="pt-2 text-[11px] text-zinc-600">Nothing set up yet — create your first API key to get started.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
