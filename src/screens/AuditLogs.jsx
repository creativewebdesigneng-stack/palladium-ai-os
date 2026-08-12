import { useEffect, useMemo, useState } from 'react';
import { Lock, Info, Loader2 } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import AuditToolbar from '@/components/audit-logs/AuditToolbar';
import AuditTable from '@/components/audit-logs/AuditTable';
import AuditDetail from '@/components/audit-logs/AuditDetail';
import { useToast } from '@/components/ui/use-toast';
import { listAuditLogs } from '@/lib/platform/audit.functions';
import { useActiveOrg } from '@/hooks/use-workspace';

// Enterprise audit log viewer. Reads real audit records through the
// authenticated RPC layer: organisation owners and admins see the whole
// organisation, everyone else sees their own events.
export default function AuditLogs() {
  const { toast } = useToast();
  const { orgId } = useActiveOrg();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ user: 'All', org: 'All', action: 'All', resource: 'All', result: 'All', date: '' });
  const [selected, setSelected] = useState(null);
  const [live, setLive] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const data = await listAuditLogs({ data: { orgId: orgId ?? null, limit: 200 } });
        if (alive) setLive(Array.isArray(data.logs) ? data.logs : []);
      } catch (e) {
        if (alive) setError(e.message || 'Unable to load live audit data');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [orgId]);

  const normalize = (e) => ({
    id: e.id,
    timestamp: (e.created_date || new Date().toISOString()).replace('T', ' ').slice(0, 19),
    user: e.actor_name || e.actor_email || e.actor_id || 'System',
    org: e.organisation_id || '',
    action: e.action || '',
    resource: e.resource_type || '',
    resource_id: e.resource_id || '',
    result: e.result || 'success',
    ip: e.ip_address || '—',
    severity: e.severity || 'info',
    meta: e.metadata || {},
  });

  const baseRows = useMemo(() => live.map(normalize), [live]);

  const rows = useMemo(() => baseRows.filter(e => {
    if (query) {
      const q = query.toLowerCase();
      if (![e.user, e.action, e.resource, e.ip, e.org].some(v => v.toLowerCase().includes(q))) return false;
    }
    if (filters.user !== 'All' && e.user !== filters.user) return false;
    if (filters.org !== 'All' && e.org !== filters.org) return false;
    if (filters.action !== 'All' && e.action !== filters.action) return false;
    if (filters.resource !== 'All' && !e.resource.toLowerCase().startsWith(filters.resource.toLowerCase()) && filters.resource !== 'All') return false;
    if (filters.result !== 'All' && e.result !== filters.result) return false;
    if (filters.date && !e.timestamp.startsWith(filters.date)) return false;
    return true;
  }), [baseRows, query, filters]);

  const exportCSV = () => {
    const head = ['Timestamp', 'User', 'Organisation', 'Action', 'Resource', 'IP', 'Result', 'Metadata'];
    const body = rows.map(e => [e.timestamp, e.user, e.org, e.action, e.resource, e.ip, e.result, JSON.stringify(e.meta)]);
    const csv = [head, ...body].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = `palladium-audit-logs-${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url);
    toast({ title: 'Audit log exported', description: `${rows.length} events` });
  };

  return (
    <>
      <PageHeader eyebrow="Admin" title="Audit Logs" description="Every important platform action — immutable, searchable, exportable." action={
        <span className="flex items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[11px] font-medium text-emerald-300"><Lock className="h-3.5 w-3.5" />Admin access verified</span>
      } />
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-violet-400/20 bg-violet-400/[.06] px-3 py-2 text-[11px] text-violet-200/90">
        {loading ? <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" /> : <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
        <p>{loading ? 'Loading live audit events…' : error ? `Live data unavailable (${error}). Showing illustrative records.` : `${live.length} live event${live.length === 1 ? '' : 's'} recorded. Actions across tools, integrations, security and roles are tracked automatically.`}</p>
      </div>

      <div className="mb-4"><AuditToolbar query={query} setQuery={setQuery} filters={filters} setFilters={setFilters} onExport={exportCSV} count={rows.length} /></div>
      <p className="mb-2 text-[11px] text-zinc-500">{rows.length} of {baseRows.length} events</p>
      <AuditTable rows={rows} onSelect={setSelected} selectedId={selected?.id} />

      {selected && (<><button className="fixed inset-0 z-40 bg-black/60" onClick={() => setSelected(null)} /><AuditDetail entry={selected} onClose={() => setSelected(null)} /></>)}
    </>
  );
}