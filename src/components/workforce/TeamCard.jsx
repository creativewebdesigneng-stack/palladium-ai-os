import { Users, Target, Activity } from 'lucide-react';
import { TEAMS } from './workforceData';

export default function TeamCard({ team }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5 transition hover:-translate-y-1 hover:border-violet-400/30">
      <div className="flex items-center gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${team.grad} text-sm font-semibold text-white shadow-lg`}>{team.name[0]}</span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-white">{team.name}</h3>
          <p className="flex items-center gap-1 text-[11px] text-zinc-500"><Target className="h-3 w-3" />{team.goal}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] ${team.status === 'Busy' ? 'bg-amber-400/10 text-amber-400' : 'bg-emerald-400/10 text-emerald-400'}`}>{team.status}</span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="flex -space-x-2">
          {team.members.map((m, i) => <span key={i} className="grid h-7 w-7 place-items-center rounded-full border-2 border-[#0c0d13] bg-gradient-to-br from-violet-500 to-cyan-400 text-[10px] font-semibold text-white">{m[0]}</span>)}
        </div>
        <span className="flex items-center gap-1 text-[11px] text-zinc-500"><Users className="h-3 w-3" />{team.members.length} members</span>
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] text-zinc-500"><span className="flex items-center gap-1"><Activity className="h-3 w-3" />Progress</span><span>{team.progress}%</span></div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${team.progress}%` }} /></div>
      </div>
    </div>
  );
}