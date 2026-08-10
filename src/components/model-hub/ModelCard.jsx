import { Eye, Wrench, Brain, Plus, X, Check } from 'lucide-react';

const SPEED_COLOR = { 'Very fast':'text-emerald-300 bg-emerald-400/10', 'Fast':'text-emerald-300 bg-emerald-400/10', 'Medium':'text-amber-300 bg-amber-400/10', 'Slow':'text-rose-300 bg-rose-400/10' };

export default function ModelCard({ model, selected, onToggle, onAction }) {
  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[.03] p-4 hover:border-violet-400/30">
      <div className="flex items-start gap-2">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${model.grad} text-sm font-semibold text-white`}>{model.provider[0]}</span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14px] font-semibold text-white">{model.name}</h3>
          <p className="text-[11px] text-zinc-500">{model.provider}</p>
        </div>
        <button onClick={onToggle} className={`rounded-lg p-1.5 ${selected ? 'bg-violet-500/20 text-violet-300' : 'text-zinc-600 hover:text-white'}`} title="Add to compare">
          {selected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>
      </div>
      <p className="mt-2 text-[11px] text-zinc-500">Context: <span className="text-zinc-300">{model.context}</span></p>
      <div className="mt-2 flex flex-wrap gap-1">
        {model.capabilities.map(c => <span key={c} className="rounded-md border border-white/10 bg-black/20 px-1.5 py-0.5 text-[10px] text-zinc-400">{c}</span>)}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px]">
        <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5"><span className="text-zinc-500">Speed</span> <span className={`ml-1 rounded px-1.5 py-0.5 text-[10px] ${SPEED_COLOR[model.speed]}`}>{model.speed}</span></div>
        <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5"><span className="text-zinc-500">Cost</span> <span className="ml-1 text-zinc-200">{model.cost}</span></div>
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5"><Eye className="h-3 w-3 text-zinc-500" /><span className="text-zinc-500">Vision</span>{model.vision ? <Check className="ml-auto h-3 w-3 text-emerald-400" /> : <X className="ml-auto h-3 w-3 text-zinc-700" />}</div>
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5"><Wrench className="h-3 w-3 text-zinc-500" /><span className="text-zinc-500">Tools</span>{model.tools ? <Check className="ml-auto h-3 w-3 text-emerald-400" /> : <X className="ml-auto h-3 w-3 text-zinc-700" />}</div>
        <div className="col-span-2 flex items-center gap-1 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5"><Brain className="h-3 w-3 text-zinc-500" /><span className="text-zinc-500">Reasoning</span>{model.reasoning ? <Check className="ml-auto h-3 w-3 text-emerald-400" /> : <X className="ml-auto h-3 w-3 text-zinc-700" />}</div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5 border-t border-white/5 pt-3">
        <button onClick={() => onAction('use')} className="rounded-lg border border-white/10 py-1.5 text-[10px] text-zinc-300 hover:bg-white/5">Use Model</button>
        <button onClick={() => onAction('connect')} className="rounded-lg border border-white/10 py-1.5 text-[10px] text-zinc-300 hover:bg-white/5">Connect</button>
        <button onClick={() => onAction('test')} className="rounded-lg border border-white/10 py-1.5 text-[10px] text-zinc-300 hover:bg-white/5">Test Model</button>
      </div>
    </div>
  );
}