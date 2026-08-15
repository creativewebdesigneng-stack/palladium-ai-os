import { useMemo, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Info, Loader2, Lock, ShieldOff, X } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import OrgFilters from '@/components/admin-orgs/OrgFilters';
import OrgsTable from '@/components/admin-orgs/OrgsTable';
import OrgDetail from '@/components/admin-orgs/OrgDetail';
import { useWorkspace } from '@/hooks/use-workspace';
import {
  listAdminOrganisationsDetailed,
  updateAdminOrganisation,
} from '@/lib/admin/admin-organisations.functions';
import { friendlyMessage } from '@/lib/errors';

function moneyFromPence(value, currency = 'GBP') {
  if (value == null) return 'Not available';
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(Number(value) / 100);
  } catch {
    return `${currency} ${(Number(value) / 100).toFixed(2)}`;
  }
}

function statusFor(subscription) {
  if (!subscription) return 'active';
  if (subscription.status === 'trialing') return 'trial';
  if (['canceled', 'unpaid', 'paused'].includes(subscription.status)) return 'suspended';
  return 'active';
}

function mapOrg(o) {
  const subscription = o.subscription ?? null;
  return {
    id: o.id,
    name: o.name,
    billingEmail: o.billingEmail || '',
    owner: o.owner || '—',
    ownerEmail: o.ownerEmail || '',
    members: o.members?.length ?? 0,
    plan: subscription?.planName ?? 'No subscription',
    projects: null,
    agents: o.agents?.length ?? 0,
    usage: {
      seats: o.members?.length ?? 0,
      teams: o.teams?.length ?? 0,
      agents: o.agents?.length ?? 0,
    },
    created: o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-GB') : '—',
    status: statusFor(subscription),
    teams: (o.teams ?? []).map((team) => team.name),
    membersList: (o.members ?? []).map((member) => ({
      n: member.name,
      e: member.email,
      r: member.role ? member.role.charAt(0).toUpperCase() + member.role.slice(1) : 'Member',
      t: member.joinedAt ? `Joined ${new Date(member.joinedAt).toLocaleDateString('en-GB')}` : '',
    })),
    agentsList: (o.agents ?? []).map((agent) => agent.name),
    billing: {
      plan: subscription?.planName ?? 'No subscription',
      mrr: subscription?.billingInterval === 'month'
        ? moneyFromPence(subscription.monthlyPricePence, subscription.currency)
        : 'Not monthly',
      method: 'Not exposed by backend',
      since: subscription?.startedAt
        ? new Date(subscription.startedAt).toLocaleDateString('en-GB')
        : 'Not available',
      seats: subscription?.seats ?? 'Not available',
      status: subscription?.status ?? 'none',
      currentPeriodEnd: subscription?.currentPeriodEnd
        ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-GB')
        : null,
      cancelAtPeriodEnd: Boolean(subscription?.cancelAtPeriodEnd),
    },
    security: null,
  };
}

export default function AdminOrganisations() {
  const { session } = useWorkspace();
  const queryClient = useQueryClient();
  const listFn = useServerFn(listAdminOrganisationsDetailed);
  const updateFn = useServerFn(updateAdminOrganisation);
  const q = useQuery({ queryKey: ['admin-orgs-detailed'], queryFn: () => listFn({ data: {} }), enabled: session === 'yes', retry: false });

  const [filters, setFilters] = useState({ q: '', plan: 'all', status: 'all', date: 'all' });
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState(null);
  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 2200); };

  const updateOrg = useMutation({
    mutationFn: (payload) => updateFn({ data: payload }),
    onSuccess: async (result) => {
      if (result?.forbidden) throw new Error('Admin access is required.');
      await queryClient.invalidateQueries({ queryKey: ['admin-orgs-detailed'] });
      setEditing(null);
      setSelected(null);
      flash('Organisation updated.');
    },
  });

  const orgs = useMemo(() => (q.data?.forbidden ? [] : (q.data?.organisations || []).map(mapOrg)), [q.data]);
  const filtered = useMemo(() => {
    let list = orgs;
    if (filters.plan !== 'all') list = list.filter(o => o.plan === filters.plan);
    if (filters.status !== 'all') list = list.filter(o => o.status === filters.status);
    if (filters.q.trim()) {
      const s = filters.q.toLowerCase();
      list = list.filter(o => o.name.toLowerCase().includes(s) || o.owner.toLowerCase().includes(s) || o.ownerEmail.toLowerCase().includes(s));
    }
    return list;
  }, [orgs, filters]);

  const forbidden = q.data?.forbidden;
  const headerAction = <span className="flex items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[11px] font-medium text-emerald-300"><Lock className="h-3.5 w-3.5" />Admin access verified</span>;

  if (session !== 'yes' || q.isLoading) {
    return (<><PageHeader eyebrow="Admin" title="Organisation Management" description="Manage all PalladiumAI organisations — access is restricted to administrators." action={headerAction} />
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.03] p-6 text-sm text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" />Loading organisations…</div></>);
  }
  if (forbidden || q.error) {
    if (q.error) console.error('[AdminOrganisations]', q.error);
    return (<><PageHeader eyebrow="Admin" title="Organisation Management" description="Manage all PalladiumAI organisations — access is restricted to administrators." action={headerAction} />
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/[.06] p-10 text-center">
        <ShieldOff className="h-8 w-8 text-rose-300" />
        <p className="text-sm font-medium text-rose-200">{forbidden ? "You don't have permission to view this page." : friendlyMessage(q.error)}</p>
        <p className="text-xs text-rose-200/70">Admin access is required. Contact a platform administrator if you believe this is a mistake.</p>
      </div></>);
  }

  return (
    <>
      <PageHeader eyebrow="Admin" title="Organisation Management" description="Live organisation membership, teams, agents and subscription context." action={headerAction} />
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-sky-400/20 bg-sky-400/[.06] px-3 py-2 text-[11px] text-sky-100/90"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><p>Values shown here come from persisted platform rows. Organisation name and billing email are editable. Suspension and deletion are intentionally unavailable until the platform has dedicated lifecycle and retention contracts.</p></div>
      <div className="mb-4"><OrgFilters filters={filters} setFilters={setFilters} resultCount={filtered.length} /></div>
      {filtered.length ? <OrgsTable orgs={filtered} onView={setSelected} onEdit={setEditing} /> : <div className="grid place-items-center rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-zinc-500">No organisations match your filters.</div>}
      <OrgDetail org={selected} onClose={() => setSelected(null)} onEdit={setEditing} />
      <EditOrganisationDialog
        org={editing}
        busy={updateOrg.isPending}
        error={updateOrg.error}
        onClose={() => { if (!updateOrg.isPending) { setEditing(null); updateOrg.reset(); } }}
        onSave={(payload) => updateOrg.mutate(payload)}
      />
      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-white/10 bg-[#10121a] px-4 py-2 text-xs text-zinc-200 shadow-2xl">{toast}</div>}
    </>
  );
}

function EditOrganisationDialog({ org, busy, error, onClose, onSave }) {
  const [name, setName] = useState(org?.name ?? '');
  const [billingEmail, setBillingEmail] = useState(org?.billingEmail ?? '');

  if (!org) return null;
  const key = `${org.id}:${org.name}:${org.billingEmail}`;
  return <EditOrganisationForm key={key} org={org} initialName={org.name} initialBillingEmail={org.billingEmail} busy={busy} error={error} onClose={onClose} onSave={onSave} />;
}

function EditOrganisationForm({ org, initialName, initialBillingEmail, busy, error, onClose, onSave }) {
  const [name, setName] = useState(initialName ?? '');
  const [billingEmail, setBillingEmail] = useState(initialBillingEmail ?? '');
  const valid = name.trim().length >= 2 && (!billingEmail.trim() || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(billingEmail.trim()));

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0c0d13] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-sm font-semibold text-white">Edit organisation</p><p className="mt-1 text-xs text-zinc-500">Update persisted organisation details.</p></div>
          <button disabled={busy} onClick={onClose} className="text-zinc-500 hover:text-white disabled:opacity-50"><X className="h-5 w-5" /></button>
        </div>
        <label className="mt-5 block text-[11px] font-medium text-zinc-400">Organisation name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-400/40" />
        <label className="mt-4 block text-[11px] font-medium text-zinc-400">Billing email</label>
        <input value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} maxLength={254} placeholder="Optional" className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-400/40" />
        {error && <p className="mt-3 text-xs text-rose-300">{friendlyMessage(error)}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button disabled={busy} onClick={onClose} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-50">Cancel</button>
          <button disabled={busy || !valid} onClick={() => onSave({ organisationId: org.id, name: name.trim(), billingEmail: billingEmail.trim() })} className="rounded-xl bg-violet-500 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-400 disabled:opacity-50">{busy ? 'Saving…' : 'Save changes'}</button>
        </div>
      </div>
    </div>
  );
}
