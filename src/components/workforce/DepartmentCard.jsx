export default function DepartmentCard({ dept }) {
  const Icon = dept.icon;
  return (
    <div className="group rounded-2xl border border-white/10 bg-white/[.025] p-5 transition hover:-translate-y-1 hover:border-violet-400/30">
      <div className="flex items-start gap-3">
        <span className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${dept.grad} text-white shadow-lg`}><Icon className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-white">{dept.name}</h3>
          <p className="truncate text-[11px] text-zinc-500">Lead · {dept.manager}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] ${dept.status === 'Busy' ? 'bg-amber-400/10 text-amber-400' : 'bg-emerald-400/10 text-emerald-400'}`}>{dept.status}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2"><p className="text-[10px] text-zinc-500">Agents</p><p className="text-zinc-200">{dept.agents}</p></div>
        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2"><p className="text-[10px] text-zinc-500">Performance</p><p className="text-zinc-200">{dept.score}%</p></div>
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] text-zinc-500"><span>Workload</span><span>{dept.workload}%</span></div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${dept.workload}%` }} /></div>
      </div>
    </div>
  );
}