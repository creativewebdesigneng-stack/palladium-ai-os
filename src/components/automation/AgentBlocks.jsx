import { motion } from 'framer-motion';
import { Bot, Cpu, MemoryStick, Wrench } from 'lucide-react';
import { AI_AGENTS, STATUS_STYLE } from './automationData';

export default function AgentBlocks() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
      <div className="mb-4 flex items-center gap-1.5">
        <Bot className="h-4 w-4 text-violet-400" />
        <h2 className="text-sm font-semibold text-white">AI Agent Blocks</h2>
        <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-zinc-400">{AI_AGENTS.length} agents</span>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {AI_AGENTS.map((a, i) => {
          const st = STATUS_STYLE[a.status];
          return (
            <motion.div
              key={a.name}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
              whileHover={{ y: -3 }}
              draggable
              className="group cursor-grab rounded-2xl border border-white/10 bg-black/20 p-3.5 hover:border-violet-400/30 active:cursor-grabbing"
            >
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <span className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${a.grad} text-white shadow-lg`}>
                    <a.icon className="h-5 w-5" />
                  </span>
                  <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#08090d] ${st.dot}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-white">{a.name}</p>
                  <p className="flex items-center gap-1 text-[10px] text-zinc-500"><Cpu className="h-2.5 w-2.5" />{a.model}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3 border-t border-white/5 pt-2.5 text-[10px]">
                <span className={`flex items-center gap-1 ${a.memory ? 'text-violet-400' : 'text-zinc-600'}`}>
                  <MemoryStick className="h-3 w-3" />{a.memory ? 'Memory' : 'No Mem'}
                </span>
                <span className="flex items-center gap-1 text-zinc-400">
                  <Wrench className="h-3 w-3" />{a.tools} tools
                </span>
                <span className={`ml-auto rounded-full px-1.5 py-0.5 text-[9px] ${st.badge}`}>{st.label}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}