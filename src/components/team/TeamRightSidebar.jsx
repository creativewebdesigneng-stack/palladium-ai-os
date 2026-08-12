import { Shield, BarChart3, Users } from 'lucide-react';
import { nameInitials, Avatar } from './shared';

function Panel({ icon: Icon, title, grad, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-3.5">
      <div className="mb-2.5 flex items-center gap-2">
        <span className={`grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-br ${grad}`}><Icon className="h-3 w-3 text-white" /></span>
        <h3 className="text-xs font-semibold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function TeamRightSidebar({ members = [] }) {
  const owners = members.filter((m) => m.role === 'owner');
  const admins = members.filter((m) => m.role === 'admin');
  const recent = [...members].sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt)).slice(0, 5);

  return (
    <div className="space-y-3">
      <Panel icon={BarChart3} title="Headcount" grad="from-violet-500 to-indigo-500">
        <div className="flex items-baseline justify-between">
          <span className="text-lg font-semibold text-white">{members.length}</span>
        </div>
        <p className="mt-1 text-[10px] text-zinc-600">total members</p>
      </Panel>

      <Panel icon={Shield} title="Owners & Admins" grad="from-rose-500 to-red-500">
        {owners.length + admins.length === 0 ? (
          <p className="text-[11px] text-zinc-500">No admins yet.</p>
        ) : (
          <div className="space-y-1.5">
            {[...owners, ...admins].map((m) => (
              <div key={m.id} className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[.02] p-2">
                <Avatar initials={nameInitials(m.fullName || m.email)} size="h-6 w-6" text="text-[9px]" />
                <p className="truncate text-[11px] text-zinc-300">{m.fullName || m.email} <span className="text-zinc-600">· {m.role}</span></p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel icon={Users} title="Recently Joined" grad="from-sky-500 to-blue-500">
        {recent.length === 0 ? (
          <p className="text-[11px] text-zinc-500">No members yet.</p>
        ) : (
          <div className="space-y-1.5">
            {recent.map((m) => (
              <div key={m.id} className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/[.02] p-2">
                <Avatar initials={nameInitials(m.fullName || m.email)} size="h-6 w-6" text="text-[9px]" />
                <div className="min-w-0">
                  <p className="truncate text-[11px] text-zinc-300">{m.fullName || m.email}</p>
                  <p className="text-[9px] text-zinc-600">{m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : ''}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
