import { useCallback, useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { listIndustryWorkspaces, saveIndustryWorkspace } from '@/lib/industry/industry-workspaces.functions';
import { mergeIndustryOperatingPicture } from '@/lib/industry/industry-operating-picture';

export default function IndustryOperatingPictureBar({ picture }) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    return listIndustryWorkspaces({ data: {} })
      .then((rows) => {
        setItems(rows);
        setSelected((current) => current && rows.some((row) => row.id === current) ? current : (rows[0]?.id || ''));
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not load industry workspaces.'));
  }, []);

  useEffect(() => { load(); }, [load]);

  const hasPicture = Boolean(picture?.maturity || picture?.suppliers || picture?.growth || picture?.opportunities);
  const workspace = items.find((item) => item.id === selected);

  async function save() {
    if (!workspace) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await saveIndustryWorkspace({ data: mergeIndustryOperatingPicture(workspace, picture) });
      setNotice('Operating picture saved to this industry workspace.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the operating picture.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[26px] border border-white/[.08] bg-black/25 p-5 lg:p-6" aria-label="Save industry operating picture">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-emerald-300">Persistent operating picture</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Save maturity, suppliers, growth and opportunities</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">The tools below calculate from the values you enter. Saving writes that picture onto an owner-scoped industry workspace and leaves unrelated risks, roadmap items and disruption notes in place.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-xl">
          <label className="min-w-0 flex-1 text-[10px] uppercase tracking-[.1em] text-zinc-600">
            Workspace
            <select value={selected} onChange={(event) => setSelected(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/[.07] bg-black/30 px-3 py-2 text-sm normal-case tracking-normal text-white" aria-label="Industry workspace">
              {items.length === 0 ? <option value="">No saved workspace</option> : items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <button type="button" onClick={save} disabled={!workspace || !hasPicture || busy} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/[.06] px-4 py-2 text-xs text-emerald-100 disabled:cursor-not-allowed disabled:opacity-40">
            <Save className="h-3.5 w-3.5" />{busy ? 'Saving…' : 'Save operating picture'}
          </button>
        </div>
      </div>
      {!items.length && <p className="mt-3 text-xs text-zinc-500">Create a workspace in the private industry workspace section before saving.</p>}
      {error && <p role="alert" className="mt-3 rounded-xl border border-rose-300/15 bg-rose-300/[.04] p-3 text-xs text-rose-200">{error}</p>}
      {notice && <p role="status" className="mt-3 rounded-xl border border-emerald-300/15 bg-emerald-300/[.04] p-3 text-xs text-emerald-100">{notice}</p>}
    </section>
  );
}
