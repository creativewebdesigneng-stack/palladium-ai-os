import { motion } from 'framer-motion';
import { Eye, Trash2, AlertCircle } from 'lucide-react';
import { SectionHead, RoleBadge, Avatar, EmptyState, nameInitials } from './shared';

const ROLE_OPTIONS = ['owner', 'admin', 'member'];

export default function MembersTable({ members = [], isLoading, error, canManage, myRole, onChangeRole, onRemove, busy }) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[.025] p-8 text-center text-xs text-zinc-500">Loading members…</div>
    );
  }

  if (error) {
    return <EmptyState icon={AlertCircle} title="Could not load members" desc="Please try again in a moment." />;
  }

  if (members.length === 0) {
    return <EmptyState icon={Eye} title="No members found" desc="No members match your search, or your organisation has none yet." />;
  }

  return (
    <div>
      <SectionHead icon={Eye} title="Members" grad="from-sky-500 to-blue-500" count={members.length} />
      <motion.div layout className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.025]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="border-b border-white/10 bg-white/[.02] text-[10px] uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Member</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Joined</th>
                {canManage && <th className="px-4 py-2.5 text-right font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {members.map((m, i) => {
                const isSelf = false;
                const lockOwner = m.role === 'owner' && myRole !== 'owner';
                return (
                  <motion.tr key={m.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.02, 0.2) }}
                    className="text-xs text-zinc-300 hover:bg-white/[.025]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar initials={nameInitials(m.fullName || m.email)} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">{m.fullName || 'Unnamed member'}</p>
                          <p className="truncate text-[10px] text-zinc-600">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {canManage && !lockOwner ? (
                        <select
                          value={m.role}
                          disabled={busy}
                          onChange={(e) => onChangeRole?.(m.id, e.target.value)}
                          className="rounded-md border border-white/10 bg-black/30 px-1.5 py-0.5 text-[10px] text-zinc-200 focus:outline-none"
                        >
                          {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      ) : (
                        <RoleBadge role={m.role} />
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : '—'}</td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            title="Remove"
                            disabled={busy || m.role === 'owner'}
                            onClick={() => onRemove?.(m.id)}
                            className="grid h-7 w-7 place-items-center rounded-lg border border-white/5 text-red-400 hover:bg-white/5 disabled:opacity-30"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
