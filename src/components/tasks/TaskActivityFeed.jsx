import { ACTIVITY } from './tasksData';

export default function TaskActivityFeed() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Live Activity</h3>
        <span className="flex items-center gap-1.5 text-[11px] text-emerald-400"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />Live</span>
      </div>
      <div className="relative space-y-4 pl-2">
        <div className="absolute left-[7px] top-1 bottom-1 w-px bg-white/10" />
        {ACTIVITY.map((a, i) => (
          <div key={i} className="relative flex gap-3">
            <div className={`relative z-10 grid h-3.5 w-3.5 place-items-center rounded-full bg-[#0c0d13] ring-2 ring-white/10`}>
              <span className={`h-1.5 w-1.5 rounded-full ${a.color.replace('text', 'bg')}`} />
            </div>
            <div className="flex-1 pb-1">
              <p className="text-xs text-zinc-300">
                <span className={`font-medium ${a.color}`}>{a.agent}</span> {a.text}
              </p>
              <p className="mt-0.5 text-[10px] text-zinc-600">{a.at}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}