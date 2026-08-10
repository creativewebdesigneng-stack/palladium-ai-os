import { RECOMMENDATIONS } from './tasksData';

export default function TaskRecommendations() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-600/10 via-[#0c0d13] to-cyan-500/5 p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(139,92,246,.22),transparent_55%)]" />
      <div className="relative">
        <div className="mb-4 flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 shadow-lg">✦</span>
          <div>
            <h3 className="text-sm font-semibold text-white">AI Recommendations</h3>
            <p className="text-[11px] text-zinc-500">Optimise your workload</p>
          </div>
        </div>
        <div className="space-y-2">
          {RECOMMENDATIONS.map((r, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
              <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${r.grad}`}>
                <r.icon className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-zinc-200">{r.text}</p>
                <div className="mt-2 flex gap-2">
                  <button className="rounded-md bg-white/10 px-2.5 py-1 text-[10px] text-white hover:bg-white/20">Apply</button>
                  <button className="rounded-md px-2.5 py-1 text-[10px] text-zinc-500 hover:text-white">Dismiss</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}