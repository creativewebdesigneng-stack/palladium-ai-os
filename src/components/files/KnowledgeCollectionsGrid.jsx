import { motion } from 'framer-motion';
import { Search, FileText, CheckCircle2 } from 'lucide-react';
import { KNOWLEDGE_COLLECTIONS } from './filesData';
import { SectionHead, Progress } from './shared';

export default function KnowledgeCollectionsGrid() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
      <SectionHead icon={FileText} title="Knowledge Collections" count={KNOWLEDGE_COLLECTIONS.length} grad="from-fuchsia-500 to-pink-500" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {KNOWLEDGE_COLLECTIONS.map((c, i) => (
          <motion.div
            key={c.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.3) }}
            whileHover={{ y: -3 }}
            className="group rounded-xl border border-white/10 bg-black/20 p-3.5 hover:border-violet-400/30"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${c.grad} shadow-lg`}>
                <c.icon className="h-5 w-5 text-white" />
              </span>
              {c.search && <Search className="h-3.5 w-3.5 text-emerald-400" />}
            </div>
            <p className="text-sm font-semibold text-white">{c.name}</p>
            <p className="mt-0.5 text-[10px] text-zinc-500">{c.docs.toLocaleString()} documents</p>
            <p className="text-[10px] text-zinc-600">Updated {c.updated}</p>

            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-[10px]">
                <span className="text-zinc-500">AI Indexed</span>
                <span className={c.color}>{c.indexed}%</span>
              </div>
              <Progress value={c.indexed} grad={c.grad} />
            </div>

            <div className="mt-2.5 flex items-center justify-between border-t border-white/5 pt-2">
              <span className="text-[10px] text-zinc-500">{c.owner}</span>
              {c.search && <span className="flex items-center gap-1 text-[10px] text-emerald-400"><CheckCircle2 className="h-2.5 w-2.5" />Search</span>}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}