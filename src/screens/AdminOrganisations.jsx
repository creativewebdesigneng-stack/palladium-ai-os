import { useState, useMemo } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { Lock, Info, Loader2, ShieldOff } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import OrgFilters from '@/components/admin-orgs/OrgFilters';
import OrgsTable from '@/components/admin-orgs/OrgsTable';
import OrgDetail from '@/components/admin-orgs/OrgDetail';
import { useWorkspace } from '@/hooks/use-workspace';
import { listAllOrganisations } from '@/lib/admin/admin.functions';
import { friendlyMessage } from '@/lib/errors';

const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Free';

function mapOrg(o) {
  return {
    id: o.id, name: o.name, owner: o.owner || '—', ownerEmail: '',
    members: o.memberCount || 0, plan: cap(o.plan), projects: 0, agents: 0,
    usage: { requests: 0, storage: 0, seats: o.memberCount || 0 },
    created: o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '—',
    status: o.status === 'suspended' ? 'suspended' : 'active',
    teams: [], membersList: [], agentsList: [],
    billing: { plan: cap(o.plan), mrr: '—', method: '—', since: '—', seats: o.memberCount || 0 },
    security: { mfaEnforced: false, sso: false, sessions: 0, risk: 'low', lastIncident: 'None' },
  };
}

export default function AdminOrganisations() {
  const { session } = useWorkspace();
  const listFn = useServerFn(listAllOrganisations);
  const q = useQuery({ queryKey: ['admin-orgs'], queryFn: () => listFn({ data: {} }), enabled: session === 'yes', retry: false });

  const [filters, setFilters] = useState({ q: '', plan: 'all', status: 'all', date: 'all' });
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);
  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 1800); };

  const orgs = useMemo(() => (q.data?.forbidden ? [] : (q.data?.organisations || []).map(mapOrg)), [q.data]);
  const filtered = useMemo(() => {
    let list = orgs;
    if (filters.plan !== 'all') list = list.filter(o => o.plan === filters.plan);
    if (filters.status !== 'all') list = list.filter(o => o.status === filters.status);
    if (filters.q.trim()) { const s = filters.q.toLowerCase(); list = list.filter(o => o.name.toLowerCase().includes(s) || o.owner.toLowerCase().includes(s)); }
    return list;
  }, [orgs, filters]);

  const handleAction = () => flash('This action requires a backend endpoint that is not connected yet.');
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
      <PageHeader eyebrow="Admin" title="Organisation Management" description="Manage all PalladiumAI organisations — access is restricted to administrators." action={headerAction} />
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-400/[.06] px-3 py-2 text-[11px] text-rose-200/90"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><p>Restricted area. All admin reads are re-verified server-side against your platform role. Edit/suspend actions are not yet wired to a backend endpoint.</p></div>
      <div className="mb-4"><OrgFilters filters={filters} setFilters={setFilters} resultCount={filtered.length} /></div>
      {filtered.length ? <OrgsTable orgs={filtered} onView={setSelected} onAction={handleAction} /> : <div className="grid place-items-center rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-zinc-500">No organisations match your filters.</div>}
      <OrgDetail org={selected} onClose={() => setSelected(null)} onAction={handleAction} />
      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-white/10 bg-[#10121a] px-4 py-2 text-xs text-zinc-200 shadow-2xl">{toast}</div>}
    </>
  );
}
