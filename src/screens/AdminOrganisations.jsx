import { useState, useMemo } from 'react';
import { Lock, Info } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import OrgFilters from '@/components/admin-orgs/OrgFilters';
import OrgsTable from '@/components/admin-orgs/OrgsTable';
import OrgDetail from '@/components/admin-orgs/OrgDetail';
import { ORGS } from '@/components/admin-orgs/orgsData';

export default function AdminOrganisations() {
  const [orgs, setOrgs] = useState(ORGS);
  const [filters, setFilters] = useState({ q: '', plan: 'all', status: 'all', date: 'all' });
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);
  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 1600); };

  const filtered = useMemo(() => {
    let list = orgs;
    if (filters.plan !== 'all') list = list.filter(o => o.plan === filters.plan);
    if (filters.status !== 'all') list = list.filter(o => o.status === filters.status);
    if (filters.q.trim()) {
      const s = filters.q.toLowerCase();
      list = list.filter(o => o.name.toLowerCase().includes(s) || o.owner.toLowerCase().includes(s));
    }
    return list;
  }, [orgs, filters]);

  const handleAction = (type, org) => {
    if (type === 'suspend') { setOrgs(prev => prev.map(o => o.id === org.id ? { ...o, status: 'suspended' } : o)); flash(`Suspended ${org.name}`); }
    else if (type === 'delete') { setOrgs(prev => prev.filter(o => o.id !== org.id)); setSelected(null); flash(`Deleted ${org.name}`); }
    else if (type === 'edit') flash(`Editing ${org.name} (placeholder)`);
  };

  return (
    <>
      <PageHeader eyebrow="Admin" title="Organisation Management" description="Manage all PalladiumAI organisations — access is restricted to administrators." action={
        <span className="flex items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[11px] font-medium text-emerald-300"><Lock className="h-3.5 w-3.5" />Admin access verified</span>
      } />
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-400/[.06] px-3 py-2 text-[11px] text-rose-200/90"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><p>Restricted area. All actions are audited. Data shown is illustrative mock data — backend-ready for live admin organisation APIs.</p></div>

      <div className="mb-4"><OrgFilters filters={filters} setFilters={setFilters} resultCount={filtered.length} /></div>
      <OrgsTable orgs={filtered} onView={setSelected} onAction={handleAction} />

      <OrgDetail org={selected} onClose={() => setSelected(null)} onAction={handleAction} />
      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-white/10 bg-[#10121a] px-4 py-2 text-xs text-zinc-200 shadow-2xl">{toast}</div>}
    </>
  );
}