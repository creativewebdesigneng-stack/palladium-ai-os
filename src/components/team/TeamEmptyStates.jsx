import { Network, Building2, MailOpen } from 'lucide-react';

export function NoTeams() {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[.02] p-10 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 shadow-lg"><Network className="h-5 w-5 text-white" /></span>
      <h4 className="mt-3 text-sm font-semibold text-white">No teams yet</h4>
      <p className="mt-1 text-xs text-zinc-500">Create your first team to group members and assign AI agents.</p>
      <button className="mt-4 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-xs font-medium text-white">Create Team</button>
    </div>
  );
}

export function NoDepartments() {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[.02] p-10 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-500 shadow-lg"><Building2 className="h-5 w-5 text-white" /></span>
      <h4 className="mt-3 text-sm font-semibold text-white">No departments yet</h4>
      <p className="mt-1 text-xs text-zinc-500">Departments help organise teams and structure reporting lines.</p>
      <button className="mt-4 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-xs font-medium text-white">Create Department</button>
    </div>
  );
}

export function NoInvitations() {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[.02] p-10 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg"><MailOpen className="h-5 w-5 text-white" /></span>
      <h4 className="mt-3 text-sm font-semibold text-white">No pending invitations</h4>
      <p className="mt-1 text-xs text-zinc-500">Every invited member has joined. Invite more people to grow your organisation.</p>
      <button className="mt-4 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-xs font-medium text-white">Invite Member</button>
    </div>
  );
}