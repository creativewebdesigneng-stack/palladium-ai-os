import { Crown, ShieldCheck, Users, KeyRound } from 'lucide-react';
import { SectionHead } from './shared';

const ROLES = [
  { id: 'owner', name: 'Owner', icon: Crown, grad: 'from-amber-500 to-yellow-500', desc: 'Full organisation control, including billing and ownership transfer.' },
  { id: 'admin', name: 'Admin', icon: ShieldCheck, grad: 'from-rose-500 to-red-500', desc: 'Manage members, teams and organisation settings.' },
  { id: 'member', name: 'Member', icon: Users, grad: 'from-sky-500 to-blue-500', desc: 'Standard workspace access without management permissions.' },
];

export default function RolesPermissions({ members = [] }) {
  return (
    <div>
      <SectionHead icon={KeyRound} title="Roles & Permissions" grad="from-amber-500 to-orange-500" count={`${ROLES.length} roles`} />
      <div className="grid gap-3 sm:grid-cols-3">
        {ROLES.map((r) => {
          const count = members.filter((m) => m.role === r.id).length;
          return (
            <div key={r.id} className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
              <div className="mb-2.5 flex items-center gap-2.5">
                <span className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${r.grad}`}><r.icon className="h-4.5 w-4.5 text-white" /></span>
                <div>
                  <p className="text-sm font-semibold text-white">{r.name}</p>
                  <p className="text-[10px] text-zinc-500">{count} member{count === 1 ? '' : 's'}</p>
                </div>
              </div>
              <p className="text-xs text-zinc-400">{r.desc}</p>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[11px] text-zinc-500">
        Roles are fixed at owner, admin and member; granular per-permission customisation isn't available yet.
      </p>
    </div>
  );
}
