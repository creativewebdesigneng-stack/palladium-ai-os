import { motion } from 'framer-motion';
import { Building2, Network, Users, Bot, ChevronRight } from 'lucide-react';
import { DEPARTMENTS, TEAMS, MEMBERS, AGENT_ASSIGNMENTS } from './teamData';
import { SectionHead, Avatar } from './shared';

export default function OrgStructure() {
  return (
    <div>
      <SectionHead icon={Building2} title="Team Structure" grad="from-violet-500 to-indigo-500" count={`${DEPARTMENTS.length} departments`} />
      <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
        {/* Organisation root */}
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-violet-400/20 bg-violet-500/5 p-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg"><Building2 className="h-4.5 w-4.5 text-white" /></span>
          <div>
            <p className="text-sm font-semibold text-white">PalladiumAI Holdings</p>
            <p className="text-[11px] text-zinc-500">128 members · 8 departments · 14 teams</p>
          </div>
        </div>

        <div className="space-y-3">
          {DEPARTMENTS.map((d, di) => {
            const teams = TEAMS.filter(t => t.dept === d.id);
            return (
              <motion.div key={d.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: di * 0.04 }}
                className="rounded-xl border border-white/10 bg-white/[.02] p-3">
                <div className="flex items-center gap-2.5">
                  <span className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${d.grad}`}><d.icon className="h-4 w-4 text-white" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">{d.name}</p>
                    <p className="text-[10px] text-zinc-500">Lead: {d.lead} · {d.members} members</p>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                    <span className="flex items-center gap-1"><Network className="h-3 w-3" />{d.teams}</span>
                    <span className="flex items-center gap-1"><Bot className="h-3 w-3" />{d.agents}</span>
                  </div>
                </div>
                {/* Teams */}
                <div className="mt-2.5 space-y-1.5 pl-10">
                  {teams.map(t => (
                    <div key={t.id} className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[.015] px-2.5 py-1.5">
                      <ChevronRight className="h-3 w-3 text-zinc-600" />
                      <Network className="h-3 w-3 text-zinc-500" />
                      <span className="flex-1 text-xs text-zinc-300">{t.name}</span>
                      <span className="flex items-center gap-1 text-[10px] text-zinc-600"><Users className="h-3 w-3" />{t.members}</span>
                      <span className="flex items-center gap-1 text-[10px] text-violet-400"><Bot className="h-3 w-3" />{t.agents.length}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}