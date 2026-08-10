import { useMemo, useState } from 'react';
import { Lock, Info, Plug, Activity, AlertTriangle, Check } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import IntegrationsToolbar from '@/components/admin-integrations/IntegrationsToolbar';
import IntegrationsTable from '@/components/admin-integrations/IntegrationsTable';
import IntegrationDrawer from '@/components/admin-integrations/IntegrationDrawer';
import { INTEGRATIONS } from '@/components/admin-integrations/adminIntegrationsData';

export default function AdminIntegrations() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('All');
  const [drawer, setDrawer] = useState(null); // { integration, action }
  const [toast, setToast] = useState(null);
  const [rows, setRows] = useState(INTEGRATIONS);

  const filtered = useMemo(() => rows.filter(i => {
    if (query && !i.name.toLowerCase().includes(query.toLowerCase()) && !i.desc.toLowerCase().includes(query.toLowerCase())) return false;
    if (category !== 'All' && i.category !== category) return false;
    if (status !== 'All' && i.status !== status) return false;
    return true;
  }), [rows, query, category, status]);

  const metrics = useMemo(() => ([
    { label: 'Total integrations', value: rows.length, Icon: Plug },
    { label: 'Enabled', value: rows.filter(i => i.status === 'Enabled').length, Icon: Check },
    { label: 'Updates available', value: rows.filter(i => i.status === 'Update available').length, Icon: Activity },
    { label: 'In beta', value: rows.filter(i => i.status === 'Beta').length, Icon: AlertTriangle },
  ]), [rows]);

  const onAction = (integration, action) => setDrawer({ integration, action });

  const onConfirm = (integration, action, cfg) => {
    setRows(prev => prev.map(i => {
      if (i.id !== integration.id) return i;
      if (action === 'enable') return { ...i, status: 'Enabled', users: i.users || 1 };
      if (action === 'disable') return { ...i, status: 'Disabled', users: 0, requests: 0, errors: 0 };
      if (action === 'update') return { ...i, status: 'Enabled', version: '2026.08' };
      return i;
    }));
    setToast(`${integration.name}: ${action === 'configure' ? 'configuration saved' : `${action}d`} successfully.`);
    setDrawer(null);
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <>
      <PageHeader eyebrow="Admin" title="Integration Management" description="Manage platform-supported integrations across all organisations." action={
        <span className="flex items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[11px] font-medium text-emerald-300"><Lock className="h-3.5 w-3.5" />Admin access verified</span>
      } />
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-400/[.06] px-3 py-2 text-[11px] text-rose-200/90"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><p>Changes affect every organisation on the platform. Disabling an integration disconnects all live usage. Data shown is illustrative mock data — backend-ready for live integration APIs.</p></div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(m => (
          <div key={m.label} className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
            <div className="flex items-center gap-2 text-zinc-500"><m.Icon className="h-4 w-4 text-violet-400" /><span className="text-[11px] font-medium uppercase tracking-wide">{m.label}</span></div>
            <p className="mt-2 text-2xl font-semibold text-white">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4"><IntegrationsToolbar query={query} setQuery={setQuery} category={category} setCategory={setCategory} status={status} setStatus={setStatus} count={filtered.length} /></div>
      <IntegrationsTable rows={filtered} onAction={onAction} />

      {drawer && (<><button className="fixed inset-0 z-40 bg-black/60" onClick={() => setDrawer(null)} /><IntegrationDrawer integration={drawer.integration} action={drawer.action} onClose={() => setDrawer(null)} onConfirm={onConfirm} /></>)}

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-500/15 px-3 py-2 text-[12px] font-medium text-emerald-200 backdrop-blur">
          <Check className="h-3.5 w-3.5" />{toast}
        </div>
      )}
    </>
  );
}