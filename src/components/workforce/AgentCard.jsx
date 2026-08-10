import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { STATUS_STYLE, TOOL_ICON } from './wfData';
import { MiniAvatar } from './wfShared';

export default function AgentCard({ agent, onOpen }) {
  const st = STATUS_STYLE[agent.status];
  return (
    <motion.button
      onClick={() => onOpen(agent)}
      whileHover={{ y: -2 }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex h-full flex-col rounded-2xl border border-white/10 bg-white/[.03] p-4 text-left transition hover:border-violet-400/30 hover:bg-white/[.05]"
    >
      <div className="flex items-center gap-3">
        <MiniAvatar letter={agent.letter} grad={agent.grad} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{agent.name}</p>
          <p className="truncate text-xs text-zinc-400">{agent.role}</p>
        </div>
        <span className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium ${st.bg} ${st.text}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{agent.status}
        </span>
      </div>

      <div className="mt-3 space-y-2 text-xs">
        <Row label="Current task" value={agent.currentTask} />
        <Row label="Model" value={agent.model} />
        <Row label="Tools" value={agent.tools.join(' · ')} />
        <Row label="Projects" value={agent.projects.join(' · ')} />
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-zinc-600">Performance</p>
          <p className="text-sm font-semibold text-white">{agent.performance}%</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-zinc-600">Last active</p>
          <p className="text-xs text-zinc-300">{agent.lastActive}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {agent.tools.slice(0, 3).map((t) => {
            const I = TOOL_ICON[t] || ChevronRight;
            return <span key={t} className="grid h-6 w-6 place-items-center rounded-md bg-white/5"><I className="h-3 w-3 text-zinc-400" /></span>;
          })}
        </div>
        <span className="flex items-center gap-1 text-[11px] text-violet-400 opacity-0 transition group-hover:opacity-100">Profile <ChevronRight className="h-3 w-3" /></span>
      </div>
    </motion.button>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="w-20 shrink-0 text-[10px] uppercase tracking-wider text-zinc-600">{label}</span>
      <span className="flex-1 truncate text-zinc-300">{value}</span>
    </div>
  );
}