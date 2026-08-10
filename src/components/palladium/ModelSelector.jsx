import { useState } from 'react';
import { Check, ChevronDown, Gauge, DollarSign, Sparkles, Brain } from 'lucide-react';
import { models } from '@/components/palladium/mockData';

const Bars = ({ level, color }) => (
  <span className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(i => (
      <span key={i} className={`h-2 w-1 rounded-sm ${i <= level ? color : 'bg-white/10'}`} />
    ))}
  </span>
);

export default function ModelSelector() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(models.find(m => m.primary) || models[0]);
  const dot = s => s === 'available' ? 'bg-emerald-400' : s === 'degraded' ? 'bg-amber-400' : 'bg-rose-400';

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-sm hover:border-white/20">
        <span className={`h-2 w-2 rounded-full ${dot(selected.status)}`} />
        <span className="font-medium text-white">{selected.name}</span>
        <ChevronDown className="h-4 w-4 text-zinc-500" />
      </button>
      {open && (
        <>
          <button className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-white/15 bg-[#14151d] shadow-2xl">
            <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-zinc-600">Connected models</div>
            <div className="max-h-80 overflow-y-auto p-1.5">
              {models.map(m => (
                <button key={m.name} onClick={() => { setSelected(m); setOpen(false); }} className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/5">
                  <span className={`mt-1.5 h-2 w-2 rounded-full ${dot(m.status)}`} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm text-white">{m.name}{m.primary && <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-[9px] text-violet-300">DEFAULT</span>}</p>
                    <p className="text-[11px] text-zinc-500">{m.provider} · {m.context} context</p>
                    <div className="mt-2 flex items-center gap-4 text-[10px] text-zinc-500">
                      <span className="flex items-center gap-1"><Gauge className="h-3 w-3" /><Bars level={m.speed} color="bg-cyan-400" /></span>
                      <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /><Bars level={m.cost} color="bg-emerald-400" /></span>
                      <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /><Bars level={m.quality} color="bg-violet-400" /></span>
                    </div>
                  </div>
                  {selected.name === m.name && <Check className="mt-1 h-4 w-4 text-violet-400" />}
                </button>
              ))}
            </div>
            <div className="border-t border-white/10 p-2 text-[11px] text-zinc-500"><Brain className="mr-1 inline h-3 w-3" />All models route through PalladiumAI</div>
          </div>
        </>
      )}
    </div>
  );
}