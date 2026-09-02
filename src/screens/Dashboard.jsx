import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Bot, Cpu, Workflow, Zap, Bell, Activity, ArrowRight, ShieldAlert, MessageSquare, Files, ListChecks, RefreshCw } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import Panel from '@/components/palladium/Panel';
import MetricCard from '@/components/palladium/MetricCard';
import AssistantPulse from '@/components/dashboard/AssistantPulse';
import { Link } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { friendlyMessage } from '@/lib/errors';
import { getDashboardSummary } from '@/lib/dashboard/dashboard.functions';
import { markNotifications } from '@/lib/mission/mission.functions';
import { useAuth } from '@/lib/AuthContext';

const quick = [
  ['Open intelligence chat', '/chat', MessageSquare],
  ['Deploy an agent', '/agents/new', Bot],
  ['Run research', '/search', Activity],
  ['Analyse a file', '/files-analysis', Files],
];

function timeAgo(iso) {
  const timestamp = new Date(iso).getTime();
  if (!Number.isFinite(timestamp)) return 'recently';
  const diff = Math.max(0, Date.now() - timestamp);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export default function Dashboard() {
  const qc = useQueryClient();
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const summaryFn = useServerFn(getDashboardSummary);
  const markNotificationsFn = useServerFn(markNotifications);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => summaryFn({ data: {} }),
    enabled: isAuthenticated,
    retry: 1,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  const markRead = useMutation({
    mutationFn: (id) => markNotificationsFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard-summary'] }),
    onError: (e) => {
      console.error('[dashboard]', e);
      toast({ title: 'Something went wrong', description: friendlyMessage(e), variant: 'destructive' });
    },
  });

  const metrics = data?.metrics;
  const usageSeries = data?.usageSeries ?? [];
  const activity = data?.activity ?? [];
  const recentAgents = data?.recentAgents ?? [];
  const recentTasks = data?.recentTasks ?? [];
  const notifications = data?.notifications ?? [];
  const credits = data?.credits;

  const pctChange = metrics && metrics.aiRequestsYesterday > 0
    ? `${(((metrics.aiRequestsToday - metrics.aiRequestsYesterday) / metrics.aiRequestsYesterday) * 100).toFixed(1)}% vs yesterday`
    : metrics && metrics.aiRequestsToday > 0
      ? 'New activity today'
      : metrics
        ? 'No requests today'
        : '';

  const maxUsage = usageSeries.reduce((max, row) => Math.max(max, Number(row.requests) || 0), 0);
  const loading = isLoadingAuth || (isAuthenticated && isLoading);

  return (
    <>
      <PageHeader
        eyebrow="Blackstar Command"
        title="Intelligence Overview"
        description="Live operational state across your agents, tasks, models and intelligence infrastructure."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={!isAuthenticated || isFetching}
              className="flex items-center gap-2 rounded-xl border border-violet-300/15 bg-violet-400/[.035] px-3 py-2 text-sm text-zinc-300 transition hover:border-violet-300/25 hover:bg-violet-400/[.07] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh state
            </button>
            <Link to="/onboarding" className="rounded-xl border border-violet-200/20 bg-violet-300 px-4 py-2 text-sm font-semibold text-[#08070c] shadow-[0_0_30px_rgba(167,139,250,.16)] transition hover:bg-violet-200">Configure Blackstar</Link>
          </div>
        }
      />

      {!isLoadingAuth && !isAuthenticated && (
        <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/[.045] p-4 backdrop-blur-xl">
          <p className="flex items-center gap-2 text-xs font-semibold text-amber-100"><ShieldAlert className="h-4 w-4" />Sign in to access Blackstar Command</p>
          <p className="mt-1 text-[11px] text-amber-200/70">Your agents, tasks, usage and operational telemetry are private to your account.</p>
        </div>
      )}

      {isAuthenticated && error && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-rose-400/20 bg-rose-500/[.045] p-4 backdrop-blur-xl">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-semibold text-rose-100"><ShieldAlert className="h-4 w-4" />Command telemetry unavailable</p>
            <p className="mt-1 text-[11px] text-rose-200/75">{friendlyMessage(error)}</p>
          </div>
          <button onClick={() => refetch()} className="ml-auto rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-white/10">Retry</button>
        </div>
      )}

      {isAuthenticated && <div className="mt-4"><AssistantPulse enabled={isAuthenticated} /></div>}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-[104px] animate-pulse rounded-2xl border border-violet-300/10 bg-[#0c0a12]/80" />)
        ) : (
          <>
            <MetricCard label="Intelligence requests" value={metrics ? metrics.aiRequestsToday.toLocaleString() : '—'} detail={pctChange} icon={Zap} />
            <MetricCard label="Agents online" value={metrics ? metrics.activeAgents : '—'} detail={metrics ? `${metrics.totalAgents} deployed` : ''} icon={Bot} />
            <MetricCard label="Tasks executing" value={metrics ? metrics.runningTasks : '—'} detail={metrics ? `${metrics.queuedTasks} queued` : ''} icon={Workflow} />
            <MetricCard label="Models connected" value={metrics ? metrics.connectedModels : '—'} detail="Across active intelligence" icon={Cpu} />
          </>
        )}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Intelligence throughput" subtitle="Request activity across the last 7 days" className="xl:col-span-2">
          {loading ? (
            <div className="h-52 animate-pulse rounded-xl bg-white/[.035]" />
          ) : maxUsage === 0 ? (
            <div className="flex h-52 flex-col items-center justify-center rounded-xl border border-dashed border-violet-300/15 bg-violet-400/[.02] text-center">
              <p className="text-xs text-zinc-500">No intelligence activity recorded in the last 7 days.</p>
              <Link to="/chat" className="mt-3 text-xs font-medium text-violet-300 hover:text-violet-200">Open intelligence chat <ArrowRight className="ml-1 inline h-3 w-3" /></Link>
            </div>
          ) : (
            <>
              <div className="flex h-52 items-end gap-2" aria-label="AI usage over the last 7 days">
                {usageSeries.map((s) => (
                  <div
                    key={s.day}
                    className="flex-1 rounded-t-md border-t border-violet-200/20 bg-gradient-to-t from-violet-950/70 via-violet-700/45 to-violet-300/85 shadow-[0_0_24px_rgba(139,92,246,.08)]"
                    style={{ height: `${Math.max(2, ((Number(s.requests) || 0) / maxUsage) * 100)}%` }}
                    title={`${new Date(s.day).toLocaleDateString('en-GB')}: ${s.requests} request${s.requests === 1 ? '' : 's'}`}
                  />
                ))}
              </div>
              <div className="mt-3 flex justify-between text-[10px] uppercase tracking-[.16em] text-zinc-600">
                {usageSeries.map((s) => <span key={s.day}>{new Date(`${s.day}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }).toUpperCase()}</span>)}
              </div>
            </>
          )}
        </Panel>
        <Panel title="Command actions" subtitle="Launch common Blackstar operations">
          <div className="grid grid-cols-2 gap-2">
            {quick.map(([label, path, Icon]) => (
              <Link key={label} to={path} className="group flex min-h-20 items-start gap-2 rounded-xl border border-violet-300/10 bg-[#0b0910]/60 p-3 text-sm text-zinc-300 transition hover:border-violet-300/25 hover:bg-violet-400/[.045]">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" /><span className="leading-5">{label}</span><ArrowRight className="ml-auto mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-violet-300" />
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Live activity" subtitle="Recent intelligence and execution events">
          {loading ? (
            <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-8 animate-pulse rounded-lg bg-white/[.035]" />)}</div>
          ) : activity.length === 0 ? (
            <div className="rounded-xl border border-dashed border-violet-300/10 p-4 text-center text-xs text-zinc-500">No activity yet.</div>
          ) : (
            <div className="space-y-4">{activity.map((a) => <div key={a.id} className="flex gap-3"><span className="mt-1.5 h-2 w-2 rounded-full bg-violet-300 ring-4 ring-violet-400/10" /><div className="min-w-0"><p className="break-words text-sm text-zinc-300">{a.message}</p><p className="mt-1 text-[10px] uppercase tracking-[.12em] text-zinc-600">{timeAgo(a.created_at)}</p></div></div>)}</div>
          )}
        </Panel>
        <Panel title="Agent network" subtitle="Recently active intelligence workers">
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-9 animate-pulse rounded-lg bg-white/[.035]" />)}</div>
          ) : recentAgents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-violet-300/10 p-4 text-center text-xs text-zinc-500">No agents yet. <Link to="/agents/new" className="text-violet-300">Deploy one</Link>.</div>
          ) : (
            <div className="space-y-2">{recentAgents.map((a) => <Link key={a.id} to={`/agents/${a.id}`} className="flex items-center gap-2 rounded-lg border border-violet-300/10 bg-[#0b0910]/50 p-2.5 text-sm text-zinc-300 transition hover:border-violet-300/20 hover:bg-violet-400/[.035]"><Bot className="h-4 w-4 text-violet-300" /><span className="truncate">{a.name}</span><span className="ml-auto text-[9px] uppercase tracking-[.12em] text-zinc-600">{a.status}</span></Link>)}</div>
          )}
        </Panel>
        <Panel title="Execution queue" subtitle="Recently created and running tasks">
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-9 animate-pulse rounded-lg bg-white/[.035]" />)}</div>
          ) : recentTasks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-violet-300/10 p-4 text-center text-xs text-zinc-500">No tasks yet.</div>
          ) : (
            <div className="space-y-2">{recentTasks.map((t) => <Link key={t.id} to="/tasks" className="flex items-center gap-2 rounded-lg border border-violet-300/10 bg-[#0b0910]/50 p-2.5 text-sm text-zinc-300 transition hover:border-violet-300/20 hover:bg-violet-400/[.035]"><ListChecks className="h-4 w-4 text-violet-300" /><span className="truncate">{t.title}</span><span className="ml-auto text-[9px] uppercase tracking-[.12em] text-zinc-600">{t.status}</span></Link>)}</div>
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Capacity" subtitle="Plan allowance and monthly execution usage">
          {loading ? (
            <div className="h-16 animate-pulse rounded-xl bg-white/[.035]" />
          ) : !credits || credits.limit == null ? (
            <p className="text-sm text-zinc-500">No usage limit configured for your plan.</p>
          ) : credits.limit < 0 ? (
            <p className="text-sm text-zinc-300">{credits.used.toLocaleString()} tasks this month · Unlimited{credits.planName ? ` · ${credits.planName}` : ''}</p>
          ) : (
            <>
              <p className="text-sm text-zinc-300">{credits.used.toLocaleString()} / {credits.limit.toLocaleString()} tasks this month{credits.planName ? ` · ${credits.planName}` : ''}</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full border border-violet-300/10 bg-black/40"><div className="h-full rounded-full bg-gradient-to-r from-violet-800 via-violet-500 to-violet-300 shadow-[0_0_20px_rgba(139,92,246,.22)]" style={{ width: `${Math.min(100, (credits.used / Math.max(1, credits.limit)) * 100)}%` }} /></div>
            </>
          )}
          <Link to="/billing" className="mt-3 flex items-center gap-1 text-xs text-violet-300">Manage capacity <ArrowRight className="h-3 w-3" /></Link>
        </Panel>
        <Panel title="Attention queue" subtitle="Notifications requiring awareness or action">
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-9 animate-pulse rounded-lg bg-white/[.035]" />)}</div>
          ) : notifications.length === 0 ? (
            <div className="rounded-xl border border-dashed border-violet-300/10 p-4 text-center text-xs text-zinc-500">All systems clear.</div>
          ) : (
            <div className="space-y-2">{notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                disabled={n.read || markRead.isPending}
                onClick={() => !n.read && markRead.mutate(n.id)}
                className="flex w-full items-center gap-2 rounded-lg border border-violet-300/10 bg-[#0b0910]/50 p-2.5 text-left text-sm text-zinc-300 transition hover:border-violet-300/20 hover:bg-violet-400/[.035] disabled:cursor-default disabled:opacity-75"
                aria-label={n.read ? `${n.title}, read` : `Mark ${n.title} as read`}
              >
                <Bell className="h-4 w-4 text-zinc-500" /><span className={`h-2 w-2 rounded-full ${n.read ? 'bg-zinc-700' : 'bg-violet-300 shadow-[0_0_10px_rgba(196,181,253,.5)]'}`} /><span className="truncate">{n.title}</span>
              </button>
            ))}</div>
          )}
          <Link to="/notifications" className="mt-3 flex items-center gap-1 text-xs text-violet-300">Open attention queue <ArrowRight className="h-3 w-3" /></Link>
        </Panel>
      </div>
    </>
  );
}
