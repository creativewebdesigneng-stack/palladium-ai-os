import { motion } from 'framer-motion';
import { Star, Share2, Eye, Download, MoreVertical } from 'lucide-react';
import { FILE_TYPES, KNOWLEDGE_STATUS } from './filesData';

export default function FileCard({ f, onOpen }) {
  const ft = FILE_TYPES[f.ext] || FILE_TYPES.txt;
  const ks = KNOWLEDGE_STATUS[f.knowledge] || KNOWLEDGE_STATUS.pending;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -3 }}
      onClick={() => onOpen(f)}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-white/[.035] hover:border-violet-400/30 hover:shadow-lg hover:shadow-violet-900/10"
    >
      {/* Thumbnail */}
      <div className={`relative flex h-24 items-center justify-center bg-gradient-to-br ${ft.grad}`}>
        <ft.icon className="h-10 w-10 text-white/80" />
        {f.starred && <Star className="absolute right-2 top-2 h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
        <span className={`absolute bottom-2 left-2 rounded-md px-1.5 py-0.5 text-[9px] font-medium uppercase ${ks.badge}`}>{ks.label}</span>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="truncate text-sm font-semibold text-white">{f.name}</p>
        <div className="mt-1 flex items-center gap-2 text-[10px] text-zinc-500">
          <span className={ft.color}>{ft.label}</span>
          <span>·</span>
          <span>{f.size}</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-[10px] text-zinc-600">{f.modified}</span>
          <div className="flex items-center gap-1.5 text-zinc-500">
            {f.shared > 0 && <span className="flex items-center gap-0.5 text-[10px]"><Share2 className="h-2.5 w-2.5" />{f.shared}</span>}
          </div>
        </div>

        {/* Tags */}
        <div className="mt-2 flex flex-wrap gap-1">
          {f.tags.slice(0, 2).map(t => (
            <span key={t} className="rounded-md bg-white/5 px-1.5 py-0.5 text-[9px] text-zinc-400">{t}</span>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-2.5 flex items-center gap-1 border-t border-white/5 pt-2 opacity-0 transition group-hover:opacity-100">
          <button className="grid h-6 w-6 place-items-center rounded-md text-zinc-500 hover:bg-white/10 hover:text-white" title="Open"><Eye className="h-3 w-3" /></button>
          <button className="grid h-6 w-6 place-items-center rounded-md text-zinc-500 hover:bg-white/10 hover:text-white" title="Download"><Download className="h-3 w-3" /></button>
          <button className="grid h-6 w-6 place-items-center rounded-md text-zinc-500 hover:bg-white/10 hover:text-white" title="Share"><Share2 className="h-3 w-3" /></button>
          <button className="ml-auto grid h-6 w-6 place-items-center rounded-md text-zinc-500 hover:bg-white/10 hover:text-white" title="More"><MoreVertical className="h-3 w-3" /></button>
        </div>
      </div>
    </motion.div>
  );
}