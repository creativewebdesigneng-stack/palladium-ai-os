import { Play, Pause, Square, RotateCcw, UserPlus, CheckCircle2, Brain, Wrench, ArrowRight, Loader2, X, Circle } from 'lucide-react';

const STATE_META = {
  done: { icon: CheckCircle2, cls: 'text-emerald-400 bg-emerald-400/10', line: 'bg-emerald-400/40' },
  active: { icon: Loader2, cls: 'text-violet-400 bg-violet-400/10', line: 'bg-violet-400/40', spin: true },
  error: { icon: X, cls: 'text-rose-400 bg-rose-400/10', line: 'bg-rose-400/40' },
  pending: { icon: Circle, cls: 'text-zinc-600 bg-white/5', line: 'bg-white/10' },
};

const STEP_ICON = [Play, Brain, Wrench, ArrowRight, Play, CheckCircle2];

export default function LiveExecution({ task }) {
  const steps = task.live;
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/[.06] to-transparent p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className={`flex h-2 w-2 animate-pulse rounded-full ${task.status === 'Running' ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
        <h3 className="text-sm font-semibold text-white">Live execution</h3>
        <span className="ml-auto text-[10px] text-zinc-500">{task.status === 'Running' ? 'in progress' : task.status.toLowerCase()}</span>
      </div>

      <div className="space-y-0">
        {steps.map((s, i) => {
          const meta = STATE_META[s.state] || STATE_META.pending;
          const I = meta.icon, StepI = STEP_ICON[i] || Circle;
          return (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className={`grid h-8 w-8 place-items-center rounded-full ${meta.cls}`}>
                  <I className={`h-4 w-4 ${meta.spin ? 'animate-spin' : ''}`} />
                </span>
                {i < steps.length - 1 && <span className={`my-1 w-px flex-1 ${meta.line}`} style={{ minHeight: 18 }} />}
              </div>
              <div className="pb-3 pt-1">
                <p className={`flex items-center gap-1.5 text-xs font-medium ${s.state === 'pending' ? 'text-zinc-500' : 'text-white'}`}>
                  <StepI className="h-3 w-3 text-zinc-500" />{s.label}
                </p>
                <p className="mt-0.5 text-[10px] text-zinc-600">
                  {s.state === 'done' ? 'completed' : s.state === 'active' ? 'running now…' : s.state === 'error' ? 'failed' : 'pending'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
        <Ctrl icon={Pause} label="Pause" />
        <Ctrl icon={Play} label="Resume" />
        <Ctrl icon={Square} label="Cancel" danger />
        <Ctrl icon={RotateCcw} label="Retry" />
        <Ctrl icon={UserPlus} label="Assign" />
        <Ctrl icon={CheckCircle2} label="Approve" primary />
      </div>
    </div>
  );
}

function Ctrl({ icon: Icon, label, primary, danger }) {
  const cls = primary ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white' : danger ? 'border-rose-400/30 text-rose-300 hover:bg-rose-400/10' : 'border-white/10 text-zinc-300 hover:bg-white/5';
  return (
    <button className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition ${cls} ${primary ? 'border-transparent' : 'border-white/10'}`}>
      <Icon className="h-3.5 w-3.5" />{label}
    </button>
  );
}