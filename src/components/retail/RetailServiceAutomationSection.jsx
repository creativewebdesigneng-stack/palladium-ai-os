import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { listRetailWorkspaces } from '@/lib/retail/retail-operations.functions';
import { getRetailServiceAutomation } from '@/lib/retail/retail-service-automation.functions';
import RetailServiceAutomation from '@/components/retail/RetailServiceAutomation';

export default function RetailServiceAutomationSection() {
  const [workspaces, setWorkspaces] = useState([]);
  const [selected, setSelected] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    listRetailWorkspaces({ data: {} })
      .then((rows) => {
        if (!active) return;
        setWorkspaces(rows);
        setSelected((current) => current && rows.some((row) => row.id === current) ? current : (rows[0]?.id || ''));
      })
      .catch((err) => active && setError(err instanceof Error ? err.message : 'Could not load Retail workspaces.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selected) { setData(null); return; }
    let active = true;
    setLoading(true); setError('');
    getRetailServiceAutomation({ data: { workspace_id: selected } })
      .then((result) => active && setData(result))
      .catch((err) => active && setError(err instanceof Error ? err.message : 'Could not load Retail service automation.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [selected]);

  async function refresh() {
    if (!selected) return;
    setLoading(true); setError('');
    try { setData(await getRetailServiceAutomation({ data: { workspace_id: selected } })); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not refresh Retail service automation.'); }
    finally { setLoading(false); }
  }

  if (!loading && workspaces.length === 0) return null;
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
        {workspaces.length > 1 && <select value={selected} onChange={(event) => setSelected(event.target.value)} className="rounded-xl border border-white/[.08] bg-black/40 px-3 py-2 text-xs text-zinc-300 outline-none"><option value="">Select Retail workspace</option>{workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.business_name}</option>)}</select>}
        <button type="button" onClick={refresh} disabled={!selected || loading} className="inline-flex items-center gap-1.5 rounded-xl border border-white/[.08] bg-black/30 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-40"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh service automation</button>
      </div>
      {error && <div className="mb-3 rounded-xl border border-rose-400/20 bg-rose-400/[.05] p-3 text-xs text-rose-200">{error}</div>}
      {selected && data ? <RetailServiceAutomation key={selected} workspaceId={selected} initialData={data} /> : loading ? <div className="rounded-[28px] border border-white/[.06] bg-black/25 p-8 text-center text-xs text-zinc-600">Loading Retail service automation…</div> : null}
    </div>
  );
}
