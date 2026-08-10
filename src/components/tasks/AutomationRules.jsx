import { AUTOMATIONS } from './tasksData';

export default function AutomationRules() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Automation Rules</h3>
        <button className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5">+ New rule</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {AUTOMATIONS.map((a, i) => (
          <div key={i} className="relative overflow-hidden rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-start gap-3">
              <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${a.grad} shadow`}>
                <a.icon className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-zinc-400">{a.trigger}</p>
                <p className="text-sm font-medium text-white">→ {a.action}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-600">{a.runs.toLocaleString()} runs</span>
                  <button className={`relative h-4 w-7 rounded-full transition-colors ${a.active ? 'bg-emerald-500' : 'bg-white/10'}`}>
                    <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${a.active ? 'left-3.5' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}