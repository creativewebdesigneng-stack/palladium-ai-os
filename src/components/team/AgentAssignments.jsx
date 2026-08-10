import { motion } from 'framer-motion';
import { Bot, ChevronRight } from 'lucide-react';
import { AGENT_ASSIGNMENTS, DEPARTMENTS } from './teamData';
import { SectionHead, StatusBadge } from './shared';

export default function AgentAssignments() {
  const byDept = DEPARTMENTS.map(d => ({
    ...d,
    agents: AGENT_ASSIGNMENTS.filter(a => a.dept === d.name),
  })).filter(d => d.agents.length > 0);

  return (
    <div>
      <SectionHead icon={Bot} title="AI Agent Assignments" grad="from-violet-500 to-fuchsia-500" count={AGENT_ASSIGNMENTS.length} />
      <div className="space-y-3">
        {byDept.map((d, di) => (
          <motion.div key={d.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: di * 0.05 }}
            className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
            <div className="mb-3 flex items-center gap-2.5">
              <span className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${d.grad}`}><d.icon className="h-4 w-4 text-white" /></span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{d.name}</p>
                <p className="text-[10px] text-zinc-500">{d.agents.length} agent{d.agents.length === 1 ? '' : 's'} assigned</p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {d.agents.map(a => (
                <div key={a.id} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[.02] p-2.5">
                  <span className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${a.grad}`}><a.icon className="h-4 w-4 text-white" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-white">{a.name}</p>
                    <p className="truncate text-[10px] text-zinc-500">{a.team} · {a.tasks} tasks</p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}