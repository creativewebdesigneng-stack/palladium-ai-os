import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Bot, FolderKanban, Workflow, ShieldCheck, Users, CreditCard, Server, Check, MailOpen, Trash2, ArrowUpRight } from 'lucide-react';
import { PriorityBadge, UnreadDot } from './shared';

const ICONS = { Bot, FolderKanban, Workflow, ShieldCheck, Users, CreditCard, Server };

export default function NotificationItem({ n, onToggleRead, onDelete }) {
  const Icon = ICONS[n.icon] || Bot;
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -10 }}
      className={`group rounded-2xl border p-4 transition ${n.read ? 'border-white/10 bg-white/[.02]' : 'border-violet-400/20 bg-violet-500/[.04]'}`}>
      <div className="flex gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${n.grad}`}><Icon className="h-4.5 w-4.5 text-white" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <UnreadDot read={n.read} />
              <h4 className="text-sm font-medium text-white">{n.title}</h4>
            </div>
            <PriorityBadge priority={n.priority} />
          </div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">{n.desc}</p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[10px] text-zinc-600">{n.time}</span>
            <div className="flex items-center gap-1.5">
              {n.related && (
                <Link to={n.related.path} className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-zinc-300 hover:bg-white/5">
                  Open {n.related.type} <ArrowUpRight className="h-3 w-3" />
                </Link>
              )}
              <button onClick={() => onToggleRead(n.id)} title={n.read ? 'Mark unread' : 'Mark read'}
                className="rounded-lg border border-white/10 p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white">
                {n.read ? <MailOpen className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
              </button>
              <button onClick={() => onDelete(n.id)} title="Delete"
                className="rounded-lg border border-red-400/20 p-1.5 text-red-300 hover:bg-red-500/10">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}