import { PROJECT_ANALYTICS } from './analyticsData';

export default function ProjectAnalytics() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <h3 className="text-sm font-semibold text-white">Project Analytics</h3>
      <p className="text-[11px] text-zinc-500">Activity & completion by project</p>
      <div className="mt-3 space-y-2">
        {PROJECT_ANALYTICS.map((p) => (
          <div key={p.project} className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-medium text-white">{p.project}</span>
              <span className="ml-auto text-[11px] text-zinc-500">{p.completion}% complete</span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-white/5"><div className="h-1.5 rounded-full bg-gradient-to-r from-violet-500 to-indigo-400" style={{ width: `${p.completion}%` }} /></div>
            <div className="mt-2 flex items-center gap-3 text-[10px] text-zinc-500">
              <span>{p.agents} agents</span><span>{p.tasks} tasks</span><span>{(p.requests / 1000).toFixed(1)}k requests</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}