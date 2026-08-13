import { Eye } from 'lucide-react';

const PLAN_CLS = {
  free: 'text-zinc-300 bg-white/5',
  explorer: 'text-zinc-200 bg-white/5',
  pro: 'text-violet-300 bg-violet-400/10',
  business: 'text-sky-300 bg-sky-400/10',
  enterprise: 'text-amber-300 bg-amber-400/10',
};
const STATUS_CLS = {
  active: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20',
  inactive: 'text-zinc-300 bg-white/5 border-white/10',
};

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '—');

/** Read-only admin directory table. Mutating actions live behind audited server functions. */
export default function UsersTable({ users, onView, planLabels = {} }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full text-left text-[12px]">
        <thead className="bg-white/[.03] text-[10px] uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-3 py-2 font-medium">User</th>
            <th className="px-3 py-2 font-medium">Plan</th>
            <th className="px-3 py-2 font-medium">Subscription</th>
            <th className="px-3 py-2 font-medium">Platform roles</th>
            <th className="px-3 py-2 font-medium">Created</th>
            <th className="px-3 py-2 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-white/[.02]">
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 text-[10px] font-semibold text-white">
                    {(u.name || u.email || '?').charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-white">{u.name}</p>
                    <p className="truncate text-[10px] text-zinc-500">{u.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-3 py-2.5">
                <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${PLAN_CLS[u.plan] ?? 'text-zinc-300 bg-white/5'}`}>
                  {planLabels[u.plan] ?? u.plan}
                </span>
              </td>
              <td className="px-3 py-2.5">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] ${STATUS_CLS[u.status] ?? STATUS_CLS.inactive}`}>
                  {u.status}
                </span>
              </td>
              <td className="px-3 py-2.5 text-zinc-400">
                {u.platformRoles?.length ? u.platformRoles.join(', ') : 'user'}
              </td>
              <td className="px-3 py-2.5 text-zinc-400">{formatDate(u.createdAt)}</td>
              <td className="px-3 py-2.5">
                <div className="flex items-center justify-end gap-1">
                  <button
                    title="View"
                    onClick={() => onView(u)}
                    className="rounded-lg border border-white/10 p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
