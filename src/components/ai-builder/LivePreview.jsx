import { useState } from 'react';
import { RotateCw, ExternalLink, Lock } from 'lucide-react';
import { VIEWPORTS, PREVIEW_URL } from './aiBuilderData';

export default function LivePreview() {
  const [vp, setVp] = useState('desktop');
  const cfg = VIEWPORTS[vp];

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c0d13]">
      <div className="flex items-center gap-1 border-b border-white/10 bg-black/30 px-2 py-1.5">
        <div className="flex gap-1">
          {Object.entries(VIEWPORTS).map(([k, v]) => { const I = v.icon; return (
            <button key={k} onClick={() => setVp(k)} className={`grid h-7 w-7 place-items-center rounded-lg ${vp === k ? 'bg-violet-500/20 text-violet-300' : 'text-zinc-400 hover:bg-white/5'}`}><I className="h-3.5 w-3.5" /></button>
          ); })}
        </div>
        <div className="relative mx-1 flex-1">
          <Lock className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-emerald-400" />
          <input value={PREVIEW_URL} readOnly className="w-full rounded-lg border border-white/10 bg-black/30 py-1.5 pl-8 pr-3 text-[11px] text-zinc-300 outline-none" />
        </div>
        <button className="grid h-7 w-7 place-items-center rounded-lg text-zinc-400 hover:bg-white/5"><RotateCw className="h-3.5 w-3.5" /></button>
        <button className="flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] text-zinc-300 hover:bg-white/10"><ExternalLink className="h-3 w-3" />Open Preview</button>
      </div>
      <div className="flex flex-1 items-start justify-center overflow-auto bg-black/30 p-3">
        <div className={`mx-auto ${cfg.w} max-w-full overflow-hidden rounded-xl border border-white/10 bg-white shadow-2xl transition-all`}>
          {/* simulated preview app */}
          <div className="border-b border-zinc-200 bg-white px-3 py-2 text-[10px] font-semibold text-zinc-800">Task Manager</div>
          <div className="grid grid-cols-3 gap-2 bg-zinc-50 p-2">
            {['To Do', 'In Progress', 'Done'].map((col, i) => (
              <div key={col} className="rounded-md bg-zinc-100 p-1.5">
                <p className="mb-1 text-[8px] font-semibold text-zinc-600">{col}</p>
                {[1, 2].map((n) => (
                  <div key={n} className="mb-1 rounded bg-white p-1.5 shadow-sm">
                    <p className="text-[7px] font-medium text-zinc-800">Task {i + 1}.{n}</p>
                    <div className="mt-1 flex items-center gap-1">
                      <span className={`rounded-full px-1 py-px text-[6px] ${i === 0 ? 'bg-rose-100 text-rose-600' : i === 1 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>{i === 0 ? 'high' : i === 1 ? 'med' : 'low'}</span>
                      <span className="text-[6px] text-zinc-400">· due {n}d</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}