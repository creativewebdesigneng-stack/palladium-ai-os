import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';
import { Bot, Cpu, Workflow, Zap, Bell, Activity, ArrowRight, ShieldAlert, MessageSquare, Files, ListChecks } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import Panel from '@/components/palladium/Panel';
import MetricCard from '@/components/palladium/MetricCard';
import { Link } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { friendlyMessage } from '@/lib/errors';
import { getDashboardSummary } from '@/lib/dashboard/dashboard.functions';
import { markNotifications } from '@/lib/mission/mission.functions';

const quick = [['New chat', '/chat', MessageSquare], ['Create agent', '/agents/new', Bot], ['Run research', '/search', Activity], ['Upload file', '/files-analysis', Files]];

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export default function Dashboard() {
  const qc = useQueryClient();
  const summaryFn = useServerFn(getDashboardSummary);
  const markNotificationsFn = useServerFn(markNotifications);

  const [session, setSession] = useState('unknown');
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => { if (alive) setSession(data.session ? 'yes' : 'no'); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ? 'yes' : 'no'));
    return () => { alive = false; sub?.subscription?.unsubscribe(); };
  }, []);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => summaryFn({ data: {} }),
    enabled: session === 'yes',
    retry: false,
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
    : metrics ? 'vs yesterday: n/a' : '';

  const maxUsage = Math.max(1, ...usageSeries.map((s) => s.requests));

  return (
    <>
      <PageHeader eyebrow="Workspace" title="AI Workspace Dashboard" description="Your AI operating system at a glance." action={<button onClick={() => toast({ title: 'Quick start', description: 'Onboarding guide will open here once the backend is connected.' })} className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200">Quick start</button>} />

      {session === 'no' && (
        <div className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-500/[.06] p-4">
          <p className="flex items-center gap-2 text-xs font-semibold text-amber-100"><ShieldAlert className="h-4 w-4" />Sign in to see your dashboard</p>
          <p className="mt-1 text-[11px] text-amber-200/80">Your agents, tasks and usage are private to your account.</p>
        </div>
      )}

      {session === 'yes' && error && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-rose-400/25 bg-rose-500/[.06] p-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-semibold text-rose-100"><ShieldAlert className="h-4 w-4" />Dashboard could not load</p>
            <p className="mt-1 text-[11px] text-rose-200/80">{friendlyMessage(error)}</p>
          </div>
          <button onClick={() => refetch()} className="ml-auto rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-white/10">Try again</button>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading && session !== 'no' ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-[104px] animate-pulse rounded-2xl border border-white/10 bg-white/[.03]" />)
        ) : (
          <>
            <MetricCard label="AI requests today" value={metrics ? metrics.aiRequestsToday.toLocaleString() : '—'} detail={pctChange} icon={Zap} />
            <MetricCard label="Running agents" value={metrics ? metrics.activeAgents : '—'} detail={metrics ? `${metrics.totalAgents} total` : ''} icon={Bot} />
            <MetricCard label="Running tasks" value={metrics ? metrics.runningTasks : '—'} detail={metrics ? `${metrics.queuedTasks} queued` : ''} icon={Workflow} />
            <MetricCard label="Connected models" value={metrics ? metrics.connectedModels : '—'} detail="Across active agents" icon={Cpu} />
          </>
        )}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="AI usage" subtitle="Requests across the last 7 days" className="xl:col-span-2">
          {isLoading && session !== 'no' ? (
            <div className="h-52 animate-pulse rounded-xl bg-white/5" />
          ) : usageSeries.length === 0 || maxUsage === 0 ? (
            <div className="flex h-52 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 text-center">
              <p className="text-xs text-zinc-500">No usage recorded in the last 7 days.</p>
            </div>
          ) : (
            <>
              <div className="flex h-52 items-end gap-2">
                {usageSeries.map((s) => (
                  <div key={s.day} className="flex-1 rounded-t-md bg-gradient-to-t from-violet-600/30 to-violet-400" style={{ height: `${Math.max(4, (s.requests / maxUsage) * 100)}%` }} title={`${s.day}: ${s.requests}`} />
                ))}
              </div>
              <div className="mt-3 flex justify-between text-[10px] text-zinc-600">
                {usageSeries.map((s) => <span key={s.day}>{new Date(s.day).toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase()}</span>)}
              </div>
            </>
          )}
        </Panel>
        <Panel title="Quick actions" subtitle="Jump back in"><div className="grid grid-cols-2 gap-2">{quick.map(([l, p, I]) => <Link key={l} to={p} className="flex items-center gap-2 rounded-xl border border-white/10 p-3 text-sm text-zinc-300 hover:border-violet-400/30 hover:bg-white/5"><I className="h-4 w-4 text-violet-400" />{l}<ArrowRight className="ml-auto h-3.5 w-3.5 text-zinc-600" /></Link>)}</div></Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Today's activity">
          {isLoading && session !== 'no' ? (
            <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-8 animate-pulse rounded-lg bg-white/5" />)}</div>
          ) : activity.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-zinc-500">No activity yet.</div>
          ) : (
            <div className="space-y-4">{activity.map((a) => <div key={a.id} className="flex gap-3"><span className="mt-1.5 h-2 w-2 rounded-full bg-violet-400 ring-4 ring-violet-400/10" /><div><p className="text-sm text-zinc-300">{a.message}</p><p className="mt-1 text-[11px] text-zinc-600">{timeAgo(a.created_at)}</p></div></div>)}</div>
          )}
        </Panel>
        <Panel title="Recent agents">
          {isLoading && session !== 'no' ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-9 animate-pulse rounded-lg bg-white/5" />)}</div>
          ) : recentAgents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-zinc-500">No agents yet.</div>
          ) : (
            <div className="space-y-2">{recentAgents.map((a) => <Link key={a.id} to="/agents" className="flex items-center gap-2 rounded-lg border border-white/10 p-2.5 text-sm text-zinc-300 hover:bg-white/5"><Bot className="h-4 w-4 text-violet-400" />{a.name}<span className="ml-auto text-[10px] text-zinc-600">{a.status}</span></Link>)}</div>
          )}
        </Panel>
        <Panel title="Recent tasks">
          {isLoading && session !== 'no' ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-9 animate-pulse rounded-lg bg-white/5" />)}</div>
          ) : recentTasks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-zinc-500">No tasks yet.</div>
          ) : (
            <div className="space-y-2">{recentTasks.map((t) => <Link key={t.id} to="/tasks" className="flex items-center gap-2 rounded-lg border border-white/10 p-2.5 text-sm text-zinc-300 hover:bg-white/5"><ListChecks className="h-4 w-4 text-cyan-400" />{t.title}<span className="ml-auto text-[10px] text-zinc-600">{t.status}</span></Link>)}</div>
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="AI credits">
          {isLoading && session !== 'no' ? (
            <div className="h-16 animate-pulse rounded-xl bg-white/5" />
          ) : !credits || credits.limit == null ? (
            <p className="text-sm text-zinc-500">No usage limit configured for your plan.</p>
          ) : (
            <>
              <p className="text-sm text-zinc-300">{credits.used.toLocaleString()} / {credits.limit.toLocaleString()} tasks this month{credits.planName ? ` · ${credits.planName}` : ''}</p>
              <div className="mt-3 h-2 rounded-full bg-white/5"><div className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${Math.min(100, (credits.used / Math.max(1, credits.limit)) * 100)}%` }} /></div>
            </>
          )}
          <Link to="/billing" className="mt-3 flex items-center gap-1 text-xs text-violet-400">Manage plan <ArrowRight className="h-3 w-3" /></Link>
        </Panel>
        <Panel title="Notifications">
          {isLoading && session !== 'no' ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-9 animate-pulse rounded-lg bg-white/5" />)}</div>
          ) : notifications.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-zinc-500">You're all caught up.</div>
          ) : (
            <div className="space-y-2">{notifications.map((n) => (
              <button key={n.id} onClick={() => !n.read && markRead.mutate(n.id)} className="flex w-full items-center gap-2 rounded-lg border border-white/10 p-2.5 text-left text-sm text-zinc-300 hover:bg-white/5">
                <Bell className="h-4 w-4 text-zinc-500" /><span className={`h-2 w-2 rounded-full ${n.read ? 'bg-zinc-700' : 'bg-violet-400'}`} />{n.title}
              </button>
            ))}</div>
          )}
          <Link to="/notifications" className="mt-3 flex items-center gap-1 text-xs text-violet-400">View all <ArrowRight className="h-3 w-3" /></Link>
        </Panel>
      </div>
    </>
  );
}
