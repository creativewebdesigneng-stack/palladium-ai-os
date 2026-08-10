import { motion } from 'framer-motion';
import { ONLINE_MEMBERS, COMMENTS, APPROVALS, RECENT_EDITS } from './projectsData';
import { SectionHead, Avatar } from './shared';
import { MessageSquare, UserCheck, FileEdit, CheckCircle2 } from 'lucide-react';

export default function ProjectsCollaboration() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Online members */}
      <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
        <SectionHead icon={UserCheck} title="Online Team Members" count={ONLINE_MEMBERS.length} grad="from-emerald-500 to-teal-500" />
        <div className="grid gap-2 sm:grid-cols-2">
          {ONLINE_MEMBERS.map((m, i) => (
            <motion.div key={m.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] p-2.5">
              <Avatar initials={m.avatar} grad={m.grad} />
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-white">{m.name}</p>
                <p className="truncate text-[10px] text-zinc-500">{m.role}</p>
              </div>
              <span className={`ml-auto rounded-md px-1.5 py-0.5 text-[10px] ${m.status === 'editing' ? 'bg-violet-500/15 text-violet-300' : m.status === 'viewing' ? 'bg-sky-500/15 text-sky-300' : 'bg-zinc-500/15 text-zinc-400'}`}>{m.status}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Comments + approvals */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
          <SectionHead icon={MessageSquare} title="Comments & Mentions" count={COMMENTS.length} grad="from-sky-500 to-blue-500" />
          <div className="space-y-3">
            {COMMENTS.map((c, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="flex gap-2.5">
                <Avatar initials={c.avatar} grad={c.grad} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-white">{c.who}</p>
                    <span className="text-[10px] text-zinc-600">{c.time}</span>
                  </div>
                  <p className="text-xs text-zinc-400">{c.mention && <span className="rounded bg-violet-500/20 px-1 text-violet-300">@{c.mention.split(' ')[0]}</span>} {c.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
          <SectionHead icon={CheckCircle2} title="Approvals" count={APPROVALS.length} grad="from-amber-500 to-orange-500" />
          <div className="space-y-2">
            {APPROVALS.map(a => (
              <div key={a.title} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] p-2.5">
                <div className="min-w-0">
                  <p className="truncate text-xs text-zinc-300">{a.title}</p>
                  <p className="text-[10px] text-zinc-600">{a.type} · {a.requester}</p>
                </div>
                <span className={`ml-auto shrink-0 rounded-md px-2 py-0.5 text-[10px] ${a.status === 'pending' ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'}`}>{a.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent edits */}
      <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4 lg:col-span-2">
        <SectionHead icon={FileEdit} title="Recent Edits" count={RECENT_EDITS.length} grad="from-fuchsia-500 to-pink-500" />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {RECENT_EDITS.map((e, i) => (
            <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="rounded-xl border border-white/10 bg-white/[.03] p-2.5">
              <p className="truncate text-xs font-medium text-zinc-200">{e.file}</p>
              <p className="text-[10px] text-zinc-500">{e.who} · {e.action}</p>
              <p className="text-[10px] text-zinc-600">{e.time}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}