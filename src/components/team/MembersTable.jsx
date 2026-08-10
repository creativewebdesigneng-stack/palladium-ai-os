import { motion } from 'framer-motion';
import { Eye, Pencil, Ban, Trash2, Bot, MoreHorizontal } from 'lucide-react';
import { MEMBERS } from './teamData';
import { SectionHead, StatusBadge, RoleBadge, Avatar } from './shared';

const ACTIONS = [
  { icon: Eye, label: 'View', cls: 'text-zinc-400 hover:text-white' },
  { icon: Pencil, label: 'Edit', cls: 'text-zinc-400 hover:text-white' },
  { icon: Ban, label: 'Suspend', cls: 'text-amber-400 hover:text-amber-300' },
  { icon: Trash2, label: 'Remove', cls: 'text-red-400 hover:text-red-300' },
];

export default function MembersTable({ query }) {
  const q = query.trim().toLowerCase();
  const list = q ? MEMBERS.filter(m => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.dept.toLowerCase().includes(q) || m.role.toLowerCase().includes(q)) : MEMBERS;

  return (
    <div>
      <SectionHead icon={Eye} title="Members" grad="from-sky-500 to-blue-500" count={list.length} />
      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[.02] p-8 text-center">
          <p className="text-sm text-zinc-400">No members match your search.</p>
        </div>
      ) : (
        <motion.div layout className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.025]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead className="border-b border-white/10 bg-white/[.02] text-[10px] uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Member</th>
                  <th className="px-4 py-2.5 font-medium">Role</th>
                  <th className="px-4 py-2.5 font-medium">Department</th>
                  <th className="px-4 py-2.5 font-medium">Team</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Last Active</th>
                  <th className="px-4 py-2.5 font-medium">Agents</th>
                  <th className="px-4 py-2.5 font-medium">Joined</th>
                  <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {list.map((m, i) => (
                  <motion.tr key={m.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.02, 0.2) }}
                    className="text-xs text-zinc-300 hover:bg-white/[.025]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar initials={m.initials} grad={m.grad} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">{m.name}</p>
                          <p className="truncate text-[10px] text-zinc-600">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><RoleBadge role={m.role} /></td>
                    <td className="px-4 py-3 text-zinc-400">{m.dept}</td>
                    <td className="px-4 py-3 text-zinc-400">{m.team}</td>
                    <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                    <td className="px-4 py-3 text-zinc-500">{m.lastActive}</td>
                    <td className="px-4 py-3">
                      {m.agents.length ? (
                        <span className="flex items-center gap-1 text-[10px] text-violet-300"><Bot className="h-3 w-3" />{m.agents.length}</span>
                      ) : <span className="text-zinc-700">—</span>}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{m.joined}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {ACTIONS.map(a => (
                          <button key={a.label} title={a.label} className={`grid h-7 w-7 place-items-center rounded-lg border border-white/5 hover:bg-white/5 ${a.cls}`}>
                            <a.icon className="h-3.5 w-3.5" />
                          </button>
                        ))}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}