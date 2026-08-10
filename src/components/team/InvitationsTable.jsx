import { motion } from 'framer-motion';
import { MailOpen, Send, X } from 'lucide-react';
import { INVITATIONS } from './teamData';
import { SectionHead, StatusBadge, RoleBadge } from './shared';

export default function InvitationsTable({ showEmpty }) {
  if (showEmpty) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[.02] p-10 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg"><MailOpen className="h-5 w-5 text-white" /></span>
        <h4 className="mt-3 text-sm font-semibold text-white">No pending invitations</h4>
        <p className="mt-1 text-xs text-zinc-500">Every invited member has joined. Invite more people to grow your organisation.</p>
      </div>
    );
  }

  return (
    <div>
      <SectionHead icon={MailOpen} title="Pending Invitations" grad="from-amber-500 to-orange-500" count={INVITATIONS.length} />
      <motion.div layout className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.025]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left">
            <thead className="border-b border-white/10 bg-white/[.02] text-[10px] uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Department</th>
                <th className="px-4 py-2.5 font-medium">Invited By</th>
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {INVITATIONS.map((inv, i) => (
                <motion.tr key={inv.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.03, 0.2) }}
                  className="text-xs text-zinc-300 hover:bg-white/[.025]">
                  <td className="px-4 py-3 font-medium text-white">{inv.email}</td>
                  <td className="px-4 py-3"><RoleBadge role={inv.role} /></td>
                  <td className="px-4 py-3 text-zinc-400">{inv.dept}</td>
                  <td className="px-4 py-3 text-zinc-400">{inv.invitedBy}</td>
                  <td className="px-4 py-3 text-zinc-500">{inv.date}</td>
                  <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[11px] text-zinc-300 hover:bg-white/5"><Send className="h-3 w-3" />Resend</button>
                      <button className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-red-400 hover:bg-white/5"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}