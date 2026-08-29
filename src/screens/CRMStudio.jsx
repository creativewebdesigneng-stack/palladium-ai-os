import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Contact, LayoutList, Loader2, Plus, Save, Settings2, Trash2 } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { useSessionReady } from '@/lib/useSessionReady';
import { friendlyMessage } from '@/lib/errors';
import { listCrm } from '@/lib/business/crm.functions';
import { deleteCrmFieldDefinition, deleteCrmView, getCrmCustomisation, saveCrmFieldDefinition, saveCrmView, updateCrmContactCustomValues } from '@/lib/business/crm-custom.functions';

const FIELD_TYPES = ['text', 'number', 'date', 'boolean', 'select', 'multi_select', 'url', 'email', 'phone'];
const BUILTIN_COLUMNS = ['name', 'email', 'phone', 'company', 'title', 'stage', 'value_gbp', 'source', 'last_contacted_at'];

export default function CRMStudio() {
  const session = useSessionReady();
  const qc = useQueryClient();
  const listCrmFn = useServerFn(listCrm);
  const customFn = useServerFn(getCrmCustomisation);
  const saveFieldFn = useServerFn(saveCrmFieldDefinition);
  const deleteFieldFn = useServerFn(deleteCrmFieldDefinition);
  const saveValuesFn = useServerFn(updateCrmContactCustomValues);
  const saveViewFn = useServerFn(saveCrmView);
  const deleteViewFn = useServerFn(deleteCrmView);
  const [field, setField] = useState({ label: '', key: '', fieldType: 'text', options: '' });
  const [selectedContactId, setSelectedContactId] = useState('');
  const [values, setValues] = useState({});
  const [view, setView] = useState({ name: '', columns: ['name', 'company', 'stage', 'value_gbp'], stage: '', isDefault: false });

  const customQ = useQuery({ queryKey: ['crm-customisation'], queryFn: () => customFn({ data: {} }), enabled: session === 'yes', retry: false });
  const crmQ = useQuery({ queryKey: ['crm', 'studio'], queryFn: () => listCrmFn({ data: {} }), enabled: session === 'yes', retry: false });
  const fields = customQ.data?.fields ?? [];
  const views = customQ.data?.views ?? [];
  const contacts = crmQ.data?.contacts ?? [];
  const selected = contacts.find((contact) => contact.id === selectedContactId);

  useEffect(() => { if (!selectedContactId && contacts.length) setSelectedContactId(contacts[0].id); }, [contacts, selectedContactId]);
  useEffect(() => { setValues(selected?.custom_values ?? {}); }, [selected]);

  const refreshCustom = () => qc.invalidateQueries({ queryKey: ['crm-customisation'] });
  const refreshCrm = async () => { await qc.invalidateQueries({ queryKey: ['crm'] }); await qc.invalidateQueries({ queryKey: ['crm', 'studio'] }); };
  const saveField = useMutation({ mutationFn: () => saveFieldFn({ data: { key: field.key.trim(), label: field.label.trim(), fieldType: field.fieldType, options: field.options.split(',').map((x) => x.trim()).filter(Boolean) } }), onSuccess: async () => { setField({ label: '', key: '', fieldType: 'text', options: '' }); await refreshCustom(); } });
  const removeField = useMutation({ mutationFn: (id) => deleteFieldFn({ data: { id } }), onSuccess: refreshCustom });
  const saveValues = useMutation({ mutationFn: () => saveValuesFn({ data: { contactId: selectedContactId, values } }), onSuccess: refreshCrm });
  const saveView = useMutation({ mutationFn: () => saveViewFn({ data: { name: view.name.trim(), filters: view.stage ? { stage: view.stage } : {}, columns: view.columns, isDefault: view.isDefault } }), onSuccess: async () => { setView({ name: '', columns: ['name', 'company', 'stage', 'value_gbp'], stage: '', isDefault: false }); await refreshCustom(); } });
  const removeView = useMutation({ mutationFn: (id) => deleteViewFn({ data: { id } }), onSuccess: refreshCustom });
  const error = customQ.error || crmQ.error || saveField.error || removeField.error || saveValues.error || saveView.error || removeView.error;
  const activeFields = useMemo(() => fields.filter((item) => item.is_active), [fields]);

  return <>
    <PageHeader eyebrow="CRM" title="CRM Studio" description="Relaticle-style custom data fields and saved views layered onto PalladiumAI's existing contacts, pipeline and activity records—one CRM source of truth, not a second database." action={<span className="inline-flex items-center gap-1.5 rounded-xl border border-violet-400/20 bg-violet-400/10 px-3 py-2 text-[11px] text-violet-200"><Settings2 className="h-3.5 w-3.5" />Custom schema</span>} />
    {error && <div className="mb-5 rounded-xl border border-rose-400/20 bg-rose-400/[.05] p-3 text-xs text-rose-200">{friendlyMessage(error)}</div>}
    {(customQ.isLoading || crmQ.isLoading) && <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.03] p-6 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" />Loading CRM schema…</div>}
    {session === 'yes' && !customQ.isLoading && !crmQ.isLoading && <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <div className="flex items-center gap-2"><Settings2 className="h-4 w-4 text-violet-300" /><h2 className="text-sm font-semibold text-white">Custom fields</h2></div><p className="mt-1 text-[11px] text-zinc-500">Add structured properties to every existing contact without altering the base CRM contract.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2"><input value={field.label} onChange={(e) => setField((v) => ({ ...v, label: e.target.value, key: v.key || slug(e.target.value) }))} className="input" placeholder="Field label" /><input value={field.key} onChange={(e) => setField((v) => ({ ...v, key: slug(e.target.value) }))} className="input" placeholder="field_key" /><select value={field.fieldType} onChange={(e) => setField((v) => ({ ...v, fieldType: e.target.value }))} className="input">{FIELD_TYPES.map((type) => <option key={type}>{type}</option>)}</select><input value={field.options} onChange={(e) => setField((v) => ({ ...v, options: e.target.value }))} disabled={!['select','multi_select'].includes(field.fieldType)} className="input disabled:opacity-30" placeholder="Options, comma separated" /></div>
        <button disabled={!field.label.trim() || !field.key.trim() || saveField.isPending} onClick={() => saveField.mutate()} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-40"><Plus className="h-3.5 w-3.5" />Add field</button>
        <div className="mt-4 space-y-2">{fields.length ? fields.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3"><div className="min-w-0 flex-1"><p className="text-xs font-medium text-white">{item.label}</p><p className="text-[10px] text-zinc-600">{item.key} · {item.field_type}</p></div><button onClick={() => removeField.mutate(item.id)} className="text-zinc-500 hover:text-rose-300" aria-label={`Delete ${item.label}`}><Trash2 className="h-3.5 w-3.5" /></button></div>) : <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-zinc-600">No custom fields yet.</p>}</div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><div className="flex items-center gap-2"><Contact className="h-4 w-4 text-violet-300" /><h2 className="text-sm font-semibold text-white">Contact custom values</h2></div><p className="mt-1 text-[11px] text-zinc-500">Edit the custom schema values stored on a real CRM contact.</p>
        <select value={selectedContactId} onChange={(e) => setSelectedContactId(e.target.value)} className="input mt-4"><option value="">Select contact</option>{contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}{contact.company ? ` · ${contact.company}` : ''}</option>)}</select>
        {selected && activeFields.length ? <div className="mt-4 space-y-3">{activeFields.map((definition) => <CustomField key={definition.id} definition={definition} value={values[definition.key]} onChange={(next) => setValues((current) => ({ ...current, [definition.key]: next }))} />)}<button onClick={() => saveValues.mutate()} disabled={saveValues.isPending} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-medium text-white"><Save className="h-3.5 w-3.5" />Save values</button></div> : <p className="mt-4 rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-zinc-600">{!contacts.length ? 'Create a CRM contact first.' : !activeFields.length ? 'Add a custom field first.' : 'Choose a contact.'}</p>}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5 xl:col-span-2"><div className="flex items-center gap-2"><LayoutList className="h-4 w-4 text-violet-300" /><h2 className="text-sm font-semibold text-white">Saved views</h2></div><p className="mt-1 text-[11px] text-zinc-500">Persist reusable CRM column/filter layouts; the next UI batch will apply them directly to the main CRM table.</p>
        <div className="mt-4 grid gap-2 lg:grid-cols-[1fr_180px_1fr_auto]"><input value={view.name} onChange={(e) => setView((v) => ({ ...v, name: e.target.value }))} className="input" placeholder="View name" /><select value={view.stage} onChange={(e) => setView((v) => ({ ...v, stage: e.target.value }))} className="input"><option value="">All stages</option>{['lead','qualified','proposal','negotiation','won','lost'].map((stage) => <option key={stage}>{stage}</option>)}</select><input value={view.columns.join(', ')} onChange={(e) => setView((v) => ({ ...v, columns: e.target.value.split(',').map((x) => x.trim()).filter((x) => BUILTIN_COLUMNS.includes(x) || activeFields.some((f) => f.key === x)) }))} className="input" placeholder="Columns" /><button disabled={!view.name.trim() || saveView.isPending} onClick={() => saveView.mutate()} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-40"><Plus className="h-3.5 w-3.5" />Save view</button></div>
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{views.map((item) => <div key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><p className="text-xs font-medium text-white">{item.name}</p><p className="mt-1 text-[10px] text-zinc-600">{(item.columns ?? []).join(', ') || 'Default columns'}</p></div><button onClick={() => removeView.mutate(item.id)} className="text-zinc-500 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button></div>{item.is_default && <span className="mt-2 inline-block rounded-lg bg-violet-400/10 px-2 py-1 text-[9px] text-violet-200">Default</span>}</div>)}{!views.length && <p className="text-xs text-zinc-600">No saved views yet.</p>}</div>
      </section>
    </div>}
    <style>{`.input{height:2.4rem;width:100%;border-radius:.75rem;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.3);padding:0 .75rem;font-size:.75rem;color:white;outline:none}.input:focus{border-color:rgba(139,92,246,.45)}.input::placeholder{color:rgb(82 82 91)}`}</style>
  </>;
}

function CustomField({ definition, value, onChange }) { const options = Array.isArray(definition.options) ? definition.options : []; if (definition.field_type === 'boolean') return <label className="flex items-center gap-2 text-xs text-zinc-300"><input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />{definition.label}</label>; if (definition.field_type === 'select') return <label className="block"><span className="label">{definition.label}</span><select className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)}><option value="">—</option>{options.map((item) => <option key={item}>{item}</option>)}</select></label>; return <label className="block"><span className="label">{definition.label}</span><input type={definition.field_type === 'number' ? 'number' : definition.field_type === 'date' ? 'date' : definition.field_type === 'email' ? 'email' : definition.field_type === 'url' ? 'url' : 'text'} className="input" value={value ?? ''} onChange={(e) => onChange(definition.field_type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)} /></label>; }
function slug(value) { return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 63).replace(/^[^a-z]+/, ''); }
