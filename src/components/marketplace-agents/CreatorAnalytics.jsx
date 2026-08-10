import { useState, useEffect } from 'react';
import { Download, Star, Bot, Coins } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { getCreatorStats } from './api';

// Creator analytics dashboard: aggregate cards (published agents, downloads,
// earnings, avg rating) + a per-agent performance table. Reads from the
// getCreatorStats backend function (cross-org aggregation via service role).
export default function CreatorAnalytics() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  useEffect(() => {
    (async () => { try { if (user) setStats(await getCreatorStats(user.id)); } catch {} })();
  }, [user]);

  if (!stats) return <div className="text-sm text-zinc-500">Loading analytics…</div>;

  const avgRating = stats.agents.length
    ? (stats.agents.reduce((s, a) => s + a.rating, 0) / stats.agents.length).toFixed(1)
    : '—';
  const cards = [
    ['Published agents', stats.agent_count, Bot],
    ['Total downloads', stats.total_downloads.toLocaleString(), Download],
    ['Total earnings', `£${stats.total_earnings.toLocaleString()}`, Coins],
    ['Avg rating', avgRating, Star],
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, Icon]) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
            <div className="flex items-center justify-between"><p className="text-[11px] text-zinc-500">{label}</p><Icon className="h-4 w-4 text-violet-400" /></div>
            <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <p className="mb-3 text-sm font-medium text-white">Per-agent performance</p>
        <div className="space-y-2">
          {stats.agents.length === 0 && <p className="text-xs text-zinc-600">No published agents yet.</p>}
          {stats.agents.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-3">
              <span className="min-w-0 flex-1 truncate text-xs text-zinc-200">{a.title}</span>
              <span className="flex items-center gap-3 text-[11px] text-zinc-500">
                <span className="flex items-center gap-1"><Download className="h-3 w-3" />{a.downloads}</span>
                <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{a.rating.toFixed(1)}</span>
                <span>£{a.earnings}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}