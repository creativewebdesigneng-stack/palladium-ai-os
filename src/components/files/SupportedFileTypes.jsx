import { motion } from 'framer-motion';
import { FileType } from 'lucide-react';
import { SUPPORTED_TYPES } from './filesData';
import { SectionHead } from './shared';

export default function SupportedFileTypes() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
      <SectionHead icon={FileType} title="Supported File Types" count={SUPPORTED_TYPES.length} grad="from-emerald-500 to-teal-500" />
      <div className="flex flex-wrap gap-2">
        {SUPPORTED_TYPES.map((t, i) => (
          <motion.div
            key={t.type}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(i * 0.02, 0.2) }}
            whileHover={{ y: -2 }}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 hover:border-violet-400/30"
          >
            <span className={`grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br ${t.grad}`}>
              <t.icon className="h-3.5 w-3.5 text-white" />
            </span>
            <div>
              <p className="text-xs font-semibold text-white">{t.type}</p>
              <p className="text-[10px] text-zinc-500">{t.count.toLocaleString()} files</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}