import { Users } from 'lucide-react';
import { SectionHead, EmptyState, Avatar, nameInitials } from './shared';

export default function CollaborationPanel({ members = [] }) {
  return (
    <div>
      <SectionHead icon={Users} title="Collaboration" grad="from-emerald-500 to-teal-500" count={members.length ? `${members.length} members` : null} />
      {members.length === 0 ? (
        <EmptyState icon={Users} title="No members yet" desc="Invite people to your organisation to see collaboration here." />
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
          <p className="mb-3 text-[11px] uppercase tracking-wide text-zinc-500">Organisation members</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[.02] p-2">
                <Avatar initials={nameInitials(m.fullName || m.email)} />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-white">{m.fullName || m.email}</p>
                  <p className="truncate text-[10px] text-zinc-500">{m.role}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <EmptyState icon={Users} title="Activity feed not available yet" desc="Live mentions, comments and approvals aren't wired to a backend feed yet." />
          </div>
        </div>
      )}
    </div>
  );
}
