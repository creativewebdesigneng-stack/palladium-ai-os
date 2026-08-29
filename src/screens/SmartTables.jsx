import { useCallback, useEffect, useMemo, useState } from 'react';
import { Database, Grid3X3, KanbanSquare, ListPlus, Loader2, Plus, RefreshCw, Save, Trash2, Workflow } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { useWorkspace } from '@/hooks/use-workspace';
import { useToast } from '@/components/ui/use-toast';
import {
  createSmartTable,
  createSmartTableView,
  deleteSmartTableRecord,
  getSmartTable,
  listSmartTables,
  saveSmartTableRecord,
} from '@/lib/data/smart-tables.functions';

const FIELD_TYPES = ['text', 'number', 'boolean', 'date', 'select', 'url', 'email'];
const blankField = () => ({ key: `field_${Math.random().toString(36).slice(2, 8)}`, name: '', type: 'text', options: [] });

export default function SmartTables() {
  const { session } = useWorkspace();
  const { toast } = useToast();
  const [tables, setTables] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState([blankField()]);
  const [draftValues, setDraftValues] = useState({});

  const loadTables = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listSmartTables({ data: undefined });
      setTables(result.tables ?? []);
      setSelectedId((current) => current ?? result.tables?.[0]?.id ?? null);
    } catch (error) {
      toast({ title: 'Could not load Smart Tables', description: error?.message || 'Please try again.', variant: 'destructive' });
    } finally { setLoading(false); }
  }, [toast]);

  const loadDetail = useCallback(async (id) => {
    if (!id) { setDetail(null); return; }
    setBusy(true);
    try { setDetail(await getSmartTable({ data: { id } })); }
    catch (error) { toast({ title: 'Could not open table', description: error?.message || 'Please try again.', variant: 'destructive' }); }
    finally { setBusy(false); }
  }, [toast]);

  useEffect(() => { if (session === 'yes') loadTables(); }, [session, loadTables]);
  useEffect(() => { if (selectedId) loadDetail(selectedId); }, [selectedId, loadDetail]);

  const create = async (event) => {
    event.preventDefault();
    if (!name.trim() || fields.some((field) => !field.name.trim())) return;
    setBusy(true);
    try {
      const normalized = fields.map((field) => ({ ...field, options: field.type === 'select' ? field.options.filter(Boolean) : undefined }));
      const table = await createSmartTable({ data: { name, description, fields: normalized } });
      setCreating(false); setName(''); setDescription(''); setFields([blankField()]);
      await loadTables(); setSelectedId(table.id);
      toast({ title: 'Smart Table created', description: `${table.name} is ready for records and views.` });
    } catch (error) { toast({ title: 'Could not create table', description: error?.message || 'Please check the fields.', variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  const addRecord = async (event) => {
    event.preventDefault();
    if (!detail?.table?.id) return;
    setBusy(true);
    try {
      await saveSmartTableRecord({ data: { tableId: detail.table.id, values: draftValues } });
      setDraftValues({});
      await loadDetail(detail.table.id);
      toast({ title: 'Record added' });
    } catch (error) { toast({ title: 'Could not save record', description: error?.message || 'Please check the values.', variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  const removeRecord = async (id) => {
    if (!detail?.table?.id) return;
    await deleteSmartTableRecord({ data: { tableId: detail.table.id, id } });
    await loadDetail(detail.table.id);
  };

  const addView = async (kind) => {
    if (!detail?.table?.id) return;
    const base = kind === 'kanban' ? 'Kanban' : kind === 'form' ? 'Form' : 'Grid';
    await createSmartTableView({ data: { tableId: detail.table.id, name: `${base} ${detail.views.length + 1}`, kind, config: {} } });
    await loadDetail(detail.table.id);
  };

  const currentFields = useMemo(() => Array.isArray(detail?.table?.fields) ? detail.table.fields : [], [detail]);

  return (
    <>
      <PageHeader
        eyebrow="Data Workspace"
        title="Smart Tables"
        description="APITable-inspired collaborative data structures, built on PalladiumAI auth, RLS, audit and workflow systems instead of a second platform stack."
        action={<button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-violet-500"><Plus className="h-4 w-4" />New table</button>}
      />

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <Info icon={Database} title="Structured records" text="Typed fields and validated JSON records with owner-scoped RLS." />
        <Info icon={Grid3X3} title="Multiple views" text="Grid, Kanban and form view definitions share the same underlying records." />
        <Info icon={Workflow} title="One automation engine" text="Automations reuse PalladiumAI Workflows rather than duplicating APITable's robot runtime." />
      </div>

      {creating && (
        <form onSubmit={create} className="mb-5 rounded-2xl border border-violet-400/20 bg-violet-500/[.04] p-5">
          <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-white">Create Smart Table</h2><button type="button" onClick={() => setCreating(false)} className="text-xs text-zinc-500">Cancel</button></div>
          <div className="mt-4 grid gap-3 md:grid-cols-2"><Field label="Name"><input className="st-field" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} /></Field><Field label="Description"><input className="st-field" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} /></Field></div>
          <div className="mt-4 space-y-2">
            {fields.map((field, index) => <div key={field.key} className="grid gap-2 rounded-xl border border-white/10 bg-black/20 p-3 md:grid-cols-[1fr_160px_1fr_auto]">
              <input className="st-field" placeholder="Field name" value={field.name} onChange={(e) => setFields((all) => all.map((item, i) => i === index ? { ...item, name: e.target.value } : item))} required />
              <select className="st-field" value={field.type} onChange={(e) => setFields((all) => all.map((item, i) => i === index ? { ...item, type: e.target.value } : item))}>{FIELD_TYPES.map((type) => <option key={type}>{type}</option>)}</select>
              {field.type === 'select' ? <input className="st-field" placeholder="Options: New, Active, Done" value={field.options.join(', ')} onChange={(e) => setFields((all) => all.map((item, i) => i === index ? { ...item, options: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) } : item))} /> : <div />}
              <button type="button" disabled={fields.length === 1} onClick={() => setFields((all) => all.filter((_, i) => i !== index))} className="rounded-lg p-2 text-zinc-600 hover:text-rose-300 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
            </div>)}
          </div>
          <div className="mt-3 flex gap-2"><button type="button" onClick={() => setFields((all) => [...all, blankField()])} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300"><ListPlus className="h-3.5 w-3.5" />Add field</button><button disabled={busy} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-50">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}Create</button></div>
        </form>
      )}

      <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-white/10 bg-white/[.03] p-3">
          <div className="mb-2 flex items-center justify-between px-2"><p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Tables</p><button onClick={loadTables} className="text-zinc-600 hover:text-zinc-300"><RefreshCw className="h-3.5 w-3.5" /></button></div>
          {loading ? <div className="p-8 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-zinc-500" /></div> : tables.length === 0 ? <p className="p-5 text-center text-xs text-zinc-600">No Smart Tables yet.</p> : <div className="space-y-1">{tables.map((table) => <button key={table.id} onClick={() => setSelectedId(table.id)} className={`w-full rounded-xl px-3 py-2.5 text-left ${selectedId === table.id ? 'bg-violet-500/10 text-white ring-1 ring-violet-400/20' : 'text-zinc-400 hover:bg-white/5'}`}><p className="truncate text-xs font-medium">{table.name}</p><p className="mt-1 truncate text-[10px] text-zinc-600">{table.fields?.length ?? 0} fields</p></button>)}</div>}
        </aside>

        <section className="min-w-0 rounded-2xl border border-white/10 bg-white/[.03] p-4">
          {busy && !detail ? <div className="grid min-h-64 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-zinc-500" /></div> : !detail ? <div className="grid min-h-64 place-items-center text-sm text-zinc-600">Choose or create a Smart Table.</div> : <>
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-semibold text-white">{detail.table.name}</h2><p className="mt-1 text-xs text-zinc-500">{detail.table.description || 'Structured workspace data'}</p></div><div className="flex flex-wrap gap-1.5">{detail.views.map((view) => <span key={view.id} className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-zinc-400">{view.kind} · {view.name}</span>)}<button onClick={() => addView('kanban')} className="rounded-lg border border-white/10 p-1.5 text-zinc-500" title="Add Kanban view"><KanbanSquare className="h-3.5 w-3.5" /></button><button onClick={() => addView('form')} className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-zinc-500">+ form</button></div></div>

            <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[700px] text-left text-xs"><thead className="bg-black/25 text-zinc-500"><tr>{currentFields.map((field) => <th key={field.key} className="px-3 py-2.5 font-medium">{field.name}<span className="ml-1 text-[9px] text-zinc-700">{field.type}</span></th>)}<th className="w-10" /></tr></thead><tbody>{detail.records.map((record) => <tr key={record.id} className="border-t border-white/5 text-zinc-300">{currentFields.map((field) => <td key={field.key} className="max-w-[260px] truncate px-3 py-2.5">{renderValue(record.values?.[field.key])}</td>)}<td><button onClick={() => removeRecord(record.id)} className="p-2 text-zinc-700 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button></td></tr>)}{detail.records.length === 0 && <tr><td colSpan={currentFields.length + 1} className="px-3 py-8 text-center text-zinc-600">No records yet.</td></tr>}</tbody></table>
            </div>

            <form onSubmit={addRecord} className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4"><p className="mb-3 text-xs font-semibold text-white">Add record</p><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{currentFields.map((field) => <RecordField key={field.key} field={field} value={draftValues[field.key]} onChange={(value) => setDraftValues((current) => ({ ...current, [field.key]: value }))} />)}</div><button disabled={busy} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"><Plus className="h-3.5 w-3.5" />Add record</button></form>
          </>}
        </section>
      </div>
      <style>{`.st-field{width:100%;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.24);border-radius:.65rem;padding:.55rem .65rem;font-size:.75rem;color:white;outline:none}.st-field:focus{border-color:rgba(167,139,250,.45)}.st-field option{background:#11131a}`}</style>
    </>
  );
}

function Info({ icon: Icon, title, text }) { return <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-violet-300" /><p className="text-xs font-semibold text-white">{title}</p></div><p className="mt-2 text-[11px] leading-5 text-zinc-500">{text}</p></div>; }
function Field({ label, children }) { return <label className="block"><span className="mb-1 block text-[11px] font-medium text-zinc-400">{label}</span>{children}</label>; }
function renderValue(value) { if (value === null || value === undefined || value === '') return '—'; if (typeof value === 'boolean') return value ? 'Yes' : 'No'; return String(value); }
function RecordField({ field, value, onChange }) {
  if (field.type === 'boolean') return <Field label={field.name}><select className="st-field" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}><option value="">—</option><option value="true">Yes</option><option value="false">No</option></select></Field>;
  if (field.type === 'select') return <Field label={field.name}><select className="st-field" value={value ?? ''} onChange={(e) => onChange(e.target.value)}><option value="">—</option>{(field.options ?? []).map((option) => <option key={option}>{option}</option>)}</select></Field>;
  const type = field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text';
  return <Field label={field.name}><input type={type} className="st-field" value={value ?? ''} onChange={(e) => onChange(e.target.value)} /></Field>;
}
