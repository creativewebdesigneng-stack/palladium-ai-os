import { useState } from 'react';
import { MailOpen, UserPlus, ShieldAlert } from 'lucide-react';
import { SectionHead, EmptyState } from './shared';

export default function InvitationsTable({ canManage, onAdd, busy }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');

  if (!canManage) {
    return <EmptyState icon={ShieldAlert} title="Not available" desc="Only owners and admins can invite new members." />;
  }

  const submit = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    onAdd?.({ email: email.trim(), role });
    setEmail('');
  };

  return (
    <div>
      <SectionHead icon={MailOpen} title="Invite a Member" grad="from-amber-500 to-orange-500" />
      <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
        <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="person@company.com"
            className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none"
          />
          <select value={role} onChange={(e) => setRole(e.target.value)}
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-200 focus:outline-none">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" disabled={busy}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-50">
            <UserPlus className="h-3.5 w-3.5" />{busy ? 'Adding…' : 'Add Member'}
          </button>
        </form>
        <p className="mt-3 text-[11px] text-zinc-500">
          The person must already have a PalladiumAI account with this email address — they'll be added to the organisation immediately.
        </p>
      </div>
      <div className="mt-4">
        <EmptyState icon={MailOpen} title="No pending invitation queue yet" desc="Invites are applied immediately once the person has an account; there's no separate pending-invite tracking yet." />
      </div>
    </div>
  );
}
