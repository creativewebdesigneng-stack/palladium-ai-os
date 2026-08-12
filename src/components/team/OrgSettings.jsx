import { useEffect, useState } from 'react';
import { Building2, Mail, Save, ShieldAlert } from 'lucide-react';
import { SectionHead, EmptyState } from './shared';

export default function OrgSettings({ org, canManage, onSave, busy }) {
  const [name, setName] = useState(org?.name ?? '');
  const [billingEmail, setBillingEmail] = useState(org?.billingEmail ?? '');

  useEffect(() => {
    setName(org?.name ?? '');
    setBillingEmail(org?.billingEmail ?? '');
  }, [org?.name, org?.billingEmail]);

  if (!org) {
    return <EmptyState icon={Building2} title="No organisation" desc="Organisation details are unavailable." />;
  }

  if (!canManage) {
    return <EmptyState icon={ShieldAlert} title="Not available" desc="Only owners and admins can change organisation settings." />;
  }

  const submit = (e) => {
    e.preventDefault();
    onSave?.({ name: name.trim() || undefined, billingEmail: billingEmail.trim() || null });
  };

  return (
    <div>
      <SectionHead icon={Building2} title="Organisation Settings" grad="from-fuchsia-500 to-purple-500" />
      <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/5 bg-white/[.02] p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              <Building2 className="h-3 w-3" />Organisation Name
            </div>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-zinc-200 focus:border-violet-400/40 focus:outline-none" />
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[.02] p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              <Mail className="h-3 w-3" />Billing Email
            </div>
            <input value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} type="email"
              className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-zinc-200 focus:border-violet-400/40 focus:outline-none" />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-[11px] text-amber-300">
          <span>Changes to organisation settings are recorded in the audit trail.</span>
          <button type="submit" disabled={busy}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
            <Save className="h-3.5 w-3.5" />{busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
