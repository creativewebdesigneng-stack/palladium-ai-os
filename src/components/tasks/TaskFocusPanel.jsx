import { useCallback, useEffect, useState } from 'react';
import { Clock3, Play, Square } from 'lucide-react';
import { listFocusSessions, startFocusSession, stopFocusSession } from '@/lib/productivity/focus.functions';
import { useToast } from '@/components/ui/use-toast';

function elapsed(startedAt) {
  if (!startedAt) return '0m';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  return hrs ? `${hrs}h ${mins % 60}m` : `${mins}m`;
}

export default function TaskFocusPanel() {
  const { toast } = useToast();
  const [label, setLabel] = useState('Deep work');
  const [summary, setSummary] = useState({ completed: 0, totalMinutes: 0, active: null });
  const [busy, setBusy] = useState(false);
  const [, setTick] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const result = await listFocusSessions({ data: { limit: 100 } });
      setSummary(result.summary || { completed: 0, totalMinutes: 0, active: null });
    } catch (error) {
      console.error('[focus]', error);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!summary.active) return undefined;
    const timer = window.setInterval(() => setTick((value) => value + 1), 30000);
    return () => window.clearInterval(timer);
  }, [summary.active]);

  async function start() {
    if (!label.trim()) return;
    setBusy(true);
    try {
      await startFocusSession({ data: { label: label.trim(), taskSource: null, taskId: null } });
      await refresh();
      toast({ title: 'Focus session started', description: 'Time is now being tracked in Tasks.' });
    } catch (error) {
      toast({ title: 'Could not start focus session', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally { setBusy(false); }
  }

  async function stop() {
    if (!summary.active?.id) return;
    setBusy(true);
    try {
      await stopFocusSession({ data: { id: summary.active.id, notes: '' } });
      await refresh();
      toast({ title: 'Focus session completed' });
    } catch (error) {
      toast({ title: 'Could not stop focus session', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally { setBusy(false); }
  }

  return (
    <div className="mb-4 grid gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-4 lg:grid-cols-[1fr_auto_auto] lg:items-center">
      <div>
        <div className="flex items-center gap-2 text-sm font-medium text-white"><Clock3 className="h-4 w-4 text-violet-300" /> Focus & time tracking</div>
        <p className="mt-1 text-xs text-zinc-500">Timebox deep work without creating a second task system. Sessions stay attached to PalladiumAI Tasks.</p>
      </div>
      <div className="flex gap-4 text-xs text-zinc-400">
        <span><b className="text-white">{summary.totalMinutes}</b> min tracked</span>
        <span><b className="text-white">{summary.completed}</b> sessions</span>
      </div>
      {summary.active ? (
        <div className="flex items-center gap-2">
          <span className="max-w-40 truncate text-xs text-emerald-300">{summary.active.label} · {elapsed(summary.active.started_at)}</span>
          <button onClick={stop} disabled={busy} className="flex items-center gap-1 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-200"><Square className="h-3.5 w-3.5" />Stop</button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input value={label} onChange={(event) => setLabel(event.target.value)} maxLength={160} className="w-36 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none" aria-label="Focus session label" />
          <button onClick={start} disabled={busy || !label.trim()} className="flex items-center gap-1 rounded-xl bg-violet-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"><Play className="h-3.5 w-3.5" />Focus</button>
        </div>
      )}
    </div>
  );
}
