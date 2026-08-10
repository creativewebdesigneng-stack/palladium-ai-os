import { ENVIRONMENTS, ENV_COLOR } from './deploymentsData';

export default function EnvOverview({ active, setActive }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {ENVIRONMENTS.map((e) => (
        <button key={e.id} onClick={() => setActive(active === e.id ? null : e.id)} className={`flex flex-col gap-2 rounded-2xl border p-4 text-left transition ${active === e.id ? 'border-violet-400/40 bg-violet-500/10' : 'border-white/10 bg-white/[.03] hover:border-white/20'}`}>
          <div className="flex items-center justify-between">
            <span className={`rounded-full border px-2 py-px text-[10px] font-medium ${ENV_COLOR[e.id]}`}>{e.name}</span>
            <span className="text-lg font-semibold text-white">{e.deployments}</span>
          </div>
          <p className="text-[11px] text-zinc-400">{e.desc}</p>
          <p className="text-[10px] text-zinc-600">{e.deployments} active deployments</p>
        </button>
      ))}
    </div>
  );
}