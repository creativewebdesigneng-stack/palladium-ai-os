import { useState } from 'react';
import { Pencil, Check, X, Plus } from 'lucide-react';

const FIELDS = [
  { key: 'price', label: 'Price (£/mo)', type: 'number' },
  { key: 'users', label: 'Users', type: 'number' },
  { key: 'projects', label: 'Projects', type: 'number' },
  { key: 'agents', label: 'Agents', type: 'number' },
  { key: 'storage', label: 'Storage (GB)', type: 'number' },
  { key: 'usage', label: 'Usage (req/mo)', type: 'number' },
];

const UNL = 'Unlimited';

export default function PlanManager({ plans, setPlans }) {
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(null);

  const startEdit = (p) => { setEditing(p.id); setDraft({ ...p, features: [...p.features] }); };
  const save = () => { setPlans(prev => prev.map(p => p.id === draft.id ? draft : p)); setEditing(null); setDraft(null); };
  const cancel = () => { setEditing(null); setDraft(null); };
  const addFeature = (f) => f.trim() && setDraft(d => ({ ...d, features: [...d.features, f.trim()] }));
  const removeFeature = (i) => setDraft(d => ({ ...d, features: d.features.filter((_, idx) => idx !== i) }));

  return (
    <div className="space-y-2">
      {plans.map(p => (
        <div key={p.id} className="rounded-xl border border-white/10 bg-white/[.02] p-3">
          {editing === p.id && draft ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} className="flex-1 rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-sm text-white focus:border-violet-400/40 focus:outline-none" />
                <button onClick={save} className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-400/15 text-emerald-300 hover:bg-emerald-400/25"><Check className="h-4 w-4" /></button>
                <button onClick={cancel} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-zinc-400 hover:bg-white/5"><X className="h-4 w-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {FIELDS.map(f => (
                  <label key={f.key} className="block">
                    <span className="text-[10px] uppercase tracking-wide text-zinc-500">{f.label}</span>
                    <input type={f.type} value={draft[f.key] ?? ''} onChange={e => setDraft({ ...draft, [f.key]: e.target.value === '' ? null : Number(e.target.value) })} className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-[12px] text-zinc-200 focus:border-violet-400/40 focus:outline-none" />
                  </label>
                ))}
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wide text-zinc-500">Features</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {draft.features.map((feat, i) => (
                    <span key={i} className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-[11px] text-zinc-300">{feat}<button onClick={() => removeFeature(i)} className="text-rose-300"><X className="h-3 w-3" /></button></span>
                  ))}
                </div>
                <FeatureAdd onAdd={addFeature} />
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white">{p.name}</p>
                  <span className="text-[12px] text-violet-300">£{p.price}/mo</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-zinc-500">
                  <span>{p.users ?? UNL} users</span><span>{p.projects ?? UNL} projects</span><span>{p.agents ?? UNL} agents</span><span>{p.storage != null ? `${p.storage}GB` : UNL}</span><span>{p.usage != null ? `${p.usage.toLocaleString()} req` : UNL}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {p.features.map((feat, i) => <span key={i} className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400">{feat}</span>)}
                </div>
              </div>
              <button onClick={() => startEdit(p)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 text-zinc-400 hover:bg-white/5"><Pencil className="h-3.5 w-3.5" /></button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function FeatureAdd({ onAdd }) {
  const [val, setVal] = useState('');
  return (
    <div className="mt-1.5 flex gap-1.5">
      <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAdd(val); setVal(''); } }} placeholder="Add feature…" className="flex-1 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-[11px] text-zinc-300 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" />
      <button onClick={() => { onAdd(val); setVal(''); }} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-zinc-400 hover:bg-white/5"><Plus className="h-3.5 w-3.5" /></button>
    </div>
  );
}