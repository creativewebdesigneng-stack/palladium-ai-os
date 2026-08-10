import { motion } from 'framer-motion';
import { Star, Copy, Archive, Trash2, ArrowUpRight, Clock } from 'lucide-react';
import { catIcon, catGrad, catLabel } from './projectsData';
import { StatusBadge, DeployBadge, Stars, Avatar, CollaboratorStack, Progress } from './shared';

export default function ProjectListRow({ p, onOpen }) {
  const Icon = catIcon(p.category);
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-white/10 bg-white/[.035] p-3 hover:bg-white/[.06] sm:grid-cols-[2fr_1fr_1fr_1fr_auto]"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${catGrad(p.category)}`}>
          <Icon className="h-4 w-4 text-white" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <button onClick={() => onOpen(p)} className="truncate text-sm font-semibold text-white hover:text-violet-300">{p.name}</button>
            <Star className={`h-3 w-3 shrink-0 ${p.favorite ? 'fill-amber-400 text-amber-400' : 'text-zinc-600'}`} />
          </div>
          <p className="truncate text-[11px] text-zinc-500">{p.description}</p>
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-2"><StatusBadge status={p.status} /></div>
      <div className="hidden sm:block"><Progress value={p.progress} grad={catGrad(p.category)} /></div>
      <div className="hidden sm:flex items-center gap-2">
        <Avatar initials={p.ownerAvatar} grad={p.ownerGrad} />
        <span className="truncate text-[11px] text-zinc-300">{p.owner}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <DeployBadge deploy={p.deploy} />
        <span className="hidden text-[10px] text-zinc-600 lg:flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{p.updated}</span>
        <button onClick={() => onOpen(p)} className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white"><ArrowUpRight className="h-3.5 w-3.5" /></button>
        {[Copy, Archive, Trash2].map((I, i) => (
          <button key={i} className="hidden sm:grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-zinc-200"><I className="h-3.5 w-3.5" /></button>
        ))}
      </div>
    </motion.div>
  );
}