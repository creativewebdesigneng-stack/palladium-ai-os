import { Eye, Pencil, Ban, Trash2 } from 'lucide-react';

const PLAN_CLS = { Free: 'text-zinc-300 bg-white/5', Pro: 'text-violet-300 bg-violet-400/10', Team: 'text-sky-300 bg-sky-400/10', Enterprise: 'text-amber-300 bg-amber-400/10' };
const STATUS_CLS = { active: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20', suspended: 'text-rose-300 bg-rose-400/10 border-rose-400/20', trial: 'text-sky-300 bg-sky-400/10 border-sky-400/20' };

export default function OrgsTable({ orgs, onView, onAction }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full text-left text-[12px]">
        <thead className="bg-white/[.03] text-[10px] uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-3 py-2 font-medium">Organisation</th>
            <th className="px-3 py-2 font-medium">Owner</th>
            <th className="px-3 py-2 font-medium">Members</th>
            <th className="px-3 py-2 font-medium">Plan</th>
            <th className="px-3 py-2 font-medium">Projects</th>
            <th className="px-3 py-2 font-medium">Agents</th>
            <th className="px-3 py-2 font-medium">Usage</th>
            <th className="px-3 py-2 font-medium">Created</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {orgs.map(o => (
            <tr key={o.id} className="hover:bg-white/[.02]">
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-[10px] font-semibold text-white">{o.name[0]}</span>
                  <span className="truncate text-[12px] font-medium text-white">{o.name}</span>
                </div>
              </td>
              <td className="px-3 py-2.5"><p className="text-zinc-200">{o.owner}</p><p className="text-[10px] text-zinc-500">{o.ownerEmail}</p></td>
              <td className="px-3 py-2.5 text-zinc-300">{o.members}</td>
              <td className="px-3 py-2.5"><span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${PLAN_CLS[o.plan]}`}>{o.plan}</span></td>
              <td className="px-3 py-2.5 text-zinc-300">{o.projects}</td>
              <td className="px-3 py-2.5 text-zinc-300">{o.agents}</td>
              <td className="px-3 py-2.5 text-zinc-400">{(o.usage.requests/1000).toFixed(1)}k req</td>
              <td className="px-3 py-2.5 text-zinc-400">{o.created}</td>
              <td className="px-3 py-2.5"><span className={`rounded-full border px-2 py-0.5 text-[10px] ${STATUS_CLS[o.status]}`}>{o.status}</span></td>
              <td className="px-3 py-2.5">
                <div className="flex items-center justify-end gap-1">
                  <IconBtn title="View" onClick={() => onView(o)}><Eye className="h-3.5 w-3.5" /></IconBtn>
                  <IconBtn title="Edit" onClick={() => onAction('edit', o)}><Pencil className="h-3.5 w-3.5" /></IconBtn>
                  <IconBtn title="Suspend" onClick={() => onAction('suspend', o)} className="text-amber-300"><Ban className="h-3.5 w-3.5" /></IconBtn>
                  <IconBtn title="Delete" onClick={() => onAction('delete', o)} className="text-rose-300"><Trash2 className="h-3.5 w-3.5" /></IconBtn>
                </div>
              </td>
            </tr>
          ))}
          {orgs.length === 0 && <tr><td colSpan={10} className="px-3 py-10 text-center text-zinc-500">No organisations match your filters.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function IconBtn({ title, onClick, className = '', children }) {
  return <button title={title} onClick={onClick} className={`grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-zinc-400 hover:bg-white/5 ${className}`}>{children}</button>;
}