import { useState, useMemo } from 'react';
import { Lock, Info } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import UserFilters from '@/components/admin-users/UserFilters';
import UsersTable from '@/components/admin-users/UsersTable';
import UserDetail from '@/components/admin-users/UserDetail';
import { USERS } from '@/components/admin-users/usersData';

export default function AdminUsers() {
  const [users, setUsers] = useState(USERS);
  const [filters, setFilters] = useState({ q: '', plan: 'all', status: 'all', org: 'all', date: 'all' });
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);
  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 1600); };

  const filtered = useMemo(() => {
    let list = users;
    if (filters.plan !== 'all') list = list.filter(u => u.plan === filters.plan);
    if (filters.status !== 'all') list = list.filter(u => u.status === filters.status);
    if (filters.org !== 'all') list = list.filter(u => u.org === filters.org);
    if (filters.q.trim()) {
      const s = filters.q.toLowerCase();
      list = list.filter(u => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
    }
    return list;
  }, [users, filters]);

  const handleAction = (type, user) => {
    if (type === 'suspend') { setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: 'suspended' } : u)); flash(`Suspended ${user.name}`); }
    else if (type === 'unsuspend') { setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: 'active' } : u)); flash(`Unsuspended ${user.name}`); }
    else if (type === 'delete') { setUsers(prev => prev.filter(u => u.id !== user.id)); setSelected(null); flash(`Deleted ${user.name}`); }
    else if (type === 'edit') flash(`Editing ${user.name} (placeholder)`);
    else if (type === 'impersonate') flash(`Impersonation placeholder — would sign in as ${user.name}`);
  };

  return (
    <>
      <PageHeader eyebrow="Admin" title="User Management" description="Manage all PalladiumAI users — access is restricted to administrators." action={
        <span className="flex items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[11px] font-medium text-emerald-300"><Lock className="h-3.5 w-3.5" />Admin access verified</span>
      } />
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-400/[.06] px-3 py-2 text-[11px] text-rose-200/90"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><p>Restricted area. All actions are audited. Data shown is illustrative mock data — backend-ready for live admin user APIs.</p></div>

      <div className="mb-4"><UserFilters filters={filters} setFilters={setFilters} resultCount={filtered.length} /></div>
      <UsersTable users={filtered} onView={setSelected} onAction={handleAction} />

      <UserDetail user={selected} onClose={() => setSelected(null)} onAction={handleAction} />
      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-white/10 bg-[#10121a] px-4 py-2 text-xs text-zinc-200 shadow-2xl">{toast}</div>}
    </>
  );
}