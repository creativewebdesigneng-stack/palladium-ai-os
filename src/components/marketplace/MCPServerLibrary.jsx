import { motion } from 'framer-motion';
import { Server, BookOpen, Lock } from 'lucide-react';
import SectionHead from './SectionHead';
import { MCP_SERVERS } from './marketplaceData';

export default function MCPServerLibrary() {
  return (
    <div>
      <SectionHead icon={Server} title="MCP Server Library" count={MCP_SERVERS.length} grad="from-sky-500 to-blue-500" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {MCP_SERVERS.map((s, i) => (
          <motion.article
            key={s.name}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.3) }}
            whileHover={{ y: -4 }}
            className="group flex flex-col rounded-2xl border border-white/10 bg-white/[.025] p-4 hover:border-violet-400/30"
          >
            <div className="flex items-center gap-2.5">
              <span className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${s.grad} text-white shadow-lg`}>
                <s.icon className="h-5 w-5" />
              </span>
              <h3 className="truncate text-sm font-semibold text-white">{s.name}</h3>
            </div>
            <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-zinc-400">{s.desc}</p>
            <div className="mt-2.5">
              <p className="mb-1 text-[10px] uppercase tracking-wider text-zinc-600">Capabilities</p>
              <div className="flex flex-wrap gap-1">
                {s.capabilities.map(c => (
                  <span key={c} className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400">{c}</span>
                ))}
              </div>
            </div>
            <div className="mt-2.5">
              <p className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wider text-zinc-600"><Lock className="h-2.5 w-2.5" />Permissions</p>
              <div className="flex flex-wrap gap-1">
                {s.permissions.map(p => (
                  <span key={p} className="rounded-md bg-amber-400/10 px-1.5 py-0.5 text-[10px] text-amber-300">{p}</span>
                ))}
              </div>
            </div>
            <div className="mt-3 flex gap-1.5 pt-1">
              <button className="flex-1 rounded-lg bg-white/10 px-2 py-1.5 text-[11px] font-medium text-white hover:bg-white/15">Install</button>
              <button className="rounded-lg border border-white/10 p-1.5 text-zinc-400 hover:bg-white/5"><BookOpen className="h-3.5 w-3.5" /></button>
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
}