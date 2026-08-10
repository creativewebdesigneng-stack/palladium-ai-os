import { motion } from 'framer-motion';
import { Star, Copy, Archive, Trash2, ArrowUpRight, Clock } from 'lucide-react';
import { catIcon, catGrad, catLabel } from './projectsData';
import { StatusBadge, DeployBadge, Stars, Avatar, CollaboratorStack, Progress } from './shared';

export default function ProjectCard({ p, onOpen }) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[.035] hover:border-violet-400/30"
    >
      {/* Thumbnail */}
      <div className={`relative h-24 bg-gradient-to-br ${p.thumbnail}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.25),transparent_60%)]" />
        <span className="absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-lg bg-black/30 backdrop-blur">
          {(() => { const I = catIcon(p.category); return <I className="h-4 w-4 text-white" />; })()}
        </span>
        <button className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-lg bg-black/30 backdrop-blur">
          <Star className={`h-3.5 w-3.5 ${p.favorite ? 'fill-amber-400 text-amber-400' : 'text-white/70'}`} />
        </button>
        <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
          <StatusBadge status={p.status} />
          <DeployBadge deploy={p.deploy} />
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <button onClick={() => onOpen(p)} className="text-left">
            <h3 className="text-sm font-semibold text-white group-hover:text-violet-300">{p.name}</h3>
            <p className="text-[11px] text-zinc-500">{catLabel(p.category)} · {p.framework}</p>
          </button>
          <Stars value={p.stars} />
        </div>
        <p className="mt-2 line-clamp-2 text-xs text-zinc-400">{p.description}</p>

        <div className="mt-3">
          <Progress value={p.progress} grad={catGrad(p.category)} />
        </div>

        <div className="mt-3 flex flex-wrap gap-1">
          {p.tags.slice(0, 3).map(t => <span key={t} className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400">#{t}</span>)}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Avatar initials={p.ownerAvatar} grad={p.ownerGrad} />
          <div className="min-w-0">
            <p className="truncate text-[11px] text-zinc-300">{p.owner}</p>
            <p className="flex items-center gap-1 text-[10px] text-zinc-600"><Clock className="h-2.5 w-2.5" />{p.updated}</p>
          </div>
          <div className="ml-auto"><CollaboratorStack list={p.collaborators} /></div>
        </div>

        <div className="mt-3 flex items-center gap-1.5 border-t border-white/5 pt-3">
          <button onClick={() => onOpen(p)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 py-1.5 text-xs font-medium text-white">
            Open <ArrowUpRight className="h-3 w-3" />
          </button>
          {[
            { icon: Copy, label: 'Duplicate' },
            { icon: Archive, label: 'Archive' },
            { icon: Trash2, label: 'Delete' },
          ].map(a => (
            <button key={a.label} title={a.label} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-zinc-200">
              <a.icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      </div>
    </motion.article>
  );
}