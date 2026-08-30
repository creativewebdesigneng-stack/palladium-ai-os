import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Activity, Brain, CheckCircle2, Clock3, Mic, ShieldAlert, Volume2, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import Panel from '@/components/palladium/Panel';
import { getAssistantObservability } from '@/lib/voice/assistant-observability.functions';
import {
  ASSISTANT_ACTIVITY_EVENT,
  assistantActivityLabel,
  getAssistantActivitySnapshot,
} from '@/lib/voice/assistant-activity';

const stateClass = {
  off: 'bg-zinc-600',
  idle: 'bg-emerald-400',
  listening: 'bg-cyan-400 animate-pulse',
  transcribing: 'bg-sky-400 animate-pulse',
  thinking: 'bg-violet-400 animate-pulse',
  navigating: 'bg-blue-400 animate-pulse',
  working: 'bg-amber-400 animate-pulse',
  waiting_approval: 'bg-orange-400 animate-pulse',
  speaking: 'bg-fuchsia-400 animate-pulse',
  error: 'bg-rose-400 animate-pulse',
};

function formatCost(pence) {
  return `£${(Number(pence || 0) / 100).toFixed(2)}`;
}

function formatDuration(ms) {
  const value = Number(ms || 0);
  if (!value) return '—';
  if (value < 1000) return `${Math.round(value)} ms`;
  return `${(value / 1000).toFixed(1)} s`;
}

export default function AssistantPulse({ enabled = true }) {
  const pulseFn = useServerFn(getAssistantObservability);
  const [activity, setActivity] = useState(() => getAssistantActivitySnapshot());
  const { data, isLoading } = useQuery({
    queryKey: ['assistant-observability'],
    queryFn: () => pulseFn({ data: {} }),
    enabled,
    staleTime: 8_000,
    refetchInterval: 12_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onActivity = (event) => setActivity(event.detail || getAssistantActivitySnapshot());
    window.addEventListener(ASSISTANT_ACTIVITY_EVENT, onActivity);
    setActivity(getAssistantActivitySnapshot());
    return () => window.removeEventListener(ASSISTANT_ACTIVITY_EVENT, onActivity);
  }, []);

  const persistentState = useMemo(() => {
    if (!data?.voice?.enabled) return 'off';
    if ((data?.pulse?.pendingApprovals ?? 0) > 0) return 'waiting_approval';
    if ((data?.pulse?.runningTasks ?? 0) > 0) return 'working';
    if ((data?.pulse?.failedTasks ?? 0) > 0) return 'error';
    return 'idle';
  }, [data]);

  const visibleState = activity?.state && activity.state !== 'idle' ? activity.state : persistentState;
  const title = assistantActivityLabel(visibleState);
  const latestTools = data?.recentTools ?? [];
  const latestTasks = data?.recentTasks ?? [];

  return (
    <Panel title="Assistant pulse" subtitle="Live voice, reasoning and agent runtime status">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className={`absolute inset-x-0 top-0 h-0.5 ${stateClass[visibleState] || stateClass.idle}`} />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`h-3 w-3 shrink-0 rounded-full ${stateClass[visibleState] || stateClass.idle}`} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">{title}</p>
              <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                {activity?.detail || activity?.label || (data?.voice?.enabled ? 'PalladiumAI assistant is ready across your workspace.' : 'Assistant is disabled in voice settings.')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-zinc-500">
            <span className="flex items-center gap-1"><Mic className="h-3 w-3" />{data?.voice?.enabled ? 'Voice on' : 'Voice off'}</span>
            <span className="flex items-center gap-1"><Volume2 className="h-3 w-3" />{data?.voice?.muted ? 'Muted' : 'Audio on'}</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-white/[.03] p-2.5"><p className="text-[10px] uppercase tracking-wide text-zinc-600">Running</p><p className="mt-1 text-lg font-semibold text-white">{isLoading ? '—' : data?.pulse?.runningTasks ?? 0}</p></div>
          <div className="rounded-xl border border-white/10 bg-white/[.03] p-2.5"><p className="text-[10px] uppercase tracking-wide text-zinc-600">Approvals</p><p className="mt-1 text-lg font-semibold text-white">{isLoading ? '—' : data?.pulse?.pendingApprovals ?? 0}</p></div>
          <div className="rounded-xl border border-white/10 bg-white/[.03] p-2.5"><p className="text-[10px] uppercase tracking-wide text-zinc-600">Assistant 24h</p><p className="mt-1 text-lg font-semibold text-white">{isLoading ? '—' : data?.pulse?.assistantRequests24h ?? 0}</p></div>
          <div className="rounded-xl border border-white/10 bg-white/[.03] p-2.5"><p className="text-[10px] uppercase tracking-wide text-zinc-600">Recent cost</p><p className="mt-1 text-lg font-semibold text-white">{isLoading ? '—' : formatCost(data?.pulse?.costPenceRecentTasks)}</p></div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center justify-between"><p className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-300"><Wrench className="h-3.5 w-3.5 text-violet-400" />Recent tool trace</p><Link to="/agent-runtime" className="text-[10px] text-violet-400 hover:text-violet-300">Runtime</Link></div>
            <div className="space-y-1.5">
              {latestTools.length ? latestTools.slice(0, 3).map((item) => (
                <div key={item.id || `${item.tool}-${item.createdAt}`} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[.02] px-2.5 py-2 text-[11px]">
                  {item.status === 'succeeded' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : item.status === 'failed' ? <ShieldAlert className="h-3.5 w-3.5 text-rose-400" /> : <Activity className="h-3.5 w-3.5 text-amber-400" />}
                  <span className="min-w-0 flex-1 truncate text-zinc-300">{item.tool}</span>
                  <span className="text-zinc-600">{formatDuration(item.durationMs)}</span>
                </div>
              )) : <div className="rounded-lg border border-dashed border-white/10 p-3 text-[11px] text-zinc-600">No recent governed tool executions.</div>}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between"><p className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-300"><Brain className="h-3.5 w-3.5 text-cyan-400" />Recent runtime work</p><Link to="/mission-control" className="text-[10px] text-violet-400 hover:text-violet-300">Mission Control</Link></div>
            <div className="space-y-1.5">
              {latestTasks.length ? latestTasks.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[.02] px-2.5 py-2 text-[11px]">
                  <Clock3 className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="min-w-0 flex-1 truncate text-zinc-300">{item.title}</span>
                  <span className="text-zinc-600">{item.status}</span>
                </div>
              )) : <div className="rounded-lg border border-dashed border-white/10 p-3 text-[11px] text-zinc-600">No recent agent tasks.</div>}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-white/10 pt-3 text-[10px] text-zinc-600">
          <span>Cloud STT: {data?.voice?.cloudSttConfigured ? data.voice.cloudSttModel : 'not configured'}</span>
          <span>Recent tokens: {(data?.pulse?.tokensInRecentTasks ?? 0).toLocaleString()}</span>
          {(data?.pulse?.failedTasks ?? 0) > 0 && <span className="text-rose-400">{data.pulse.failedTasks} recent failure{data.pulse.failedTasks === 1 ? '' : 's'}</span>}
        </div>
      </div>
    </Panel>
  );
}
