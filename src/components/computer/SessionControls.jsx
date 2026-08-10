import { Pause, Play, Square, RotateCw } from 'lucide-react';

export default function SessionControls({ state, onAction }) {
  return (
    <div className="flex flex-wrap gap-2">
      {state === 'running' ? (
        <Ctrl icon={Pause} label="Pause" onClick={() => onAction('paused')} />
      ) : (
        <Ctrl icon={Play} label="Resume" onClick={() => onAction('running')} accent />
      )}
      <Ctrl icon={Square} label="Stop" danger onClick={() => onAction('stopped')} />
      <Ctrl icon={RotateCw} label="Restart" onClick={() => onAction('running')} />
      <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-zinc-400">
        State: <span className={`font-medium ${state === 'running' ? 'text-emerald-400' : state === 'paused' ? 'text-amber-400' : 'text-rose-400'}`}>{state}</span>
      </div>
    </div>
  );
}

function Ctrl({ icon: Icon, label, onClick, accent, danger }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition ${danger ? 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25' : accent ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white' : 'border border-white/10 text-zinc-300 hover:bg-white/5'}`}>
      <Icon className="h-3.5 w-3.5" />{label}
    </button>
  );
}