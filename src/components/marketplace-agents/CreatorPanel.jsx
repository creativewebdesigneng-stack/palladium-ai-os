import { useState } from 'react';
import { Sparkles, Rocket, ImagePlus, Plus, X } from 'lucide-react';
import { CREATOR_FIELDS, CATEGORIES } from './marketplaceData';

const GRADS = ['from-violet-500 to-indigo-500','from-sky-500 to-cyan-500','from-emerald-500 to-teal-500','from-fuchsia-500 to-pink-500','from-amber-500 to-orange-500','from-rose-500 to-red-500'];

export default function CreatorPanel({ onPublish }) {
  const [form, setForm] = useState({ name: '', description: '', category: CATEGORIES[1].label, capabilities: [], pricing: 'Free', documentation: '', icon: GRADS[0] });
  const [capInput, setCapInput] = useState('');
  const [published, setPublished] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const addCap = () => { const v = capInput.trim(); if (v && !form.capabilities.includes(v)) set('capabilities', [...form.capabilities, v]); setCapInput(''); };
  const removeCap = (c) => set('capabilities', form.capabilities.filter((x) => x !== c));

  const submit = (e) => {
    e.preventDefault();
    onPublish(form);
    setPublished(true);
    setTimeout(() => setPublished(false), 3500);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/[.04] to-transparent p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500"><Rocket className="h-4 w-4 text-white" /></span>
        <div>
          <h3 className="text-sm font-semibold text-white">Publish your agent</h3>
          <p className="text-[11px] text-zinc-500">Share your agent with the PalladiumAI community.</p>
        </div>
      </div>

      {published && <div className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-200">Agent “{form.name}” submitted for review. You’ll be notified when it’s listed.</div>}

      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Agent name"><input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Onboarding Agent" required className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" /></Field>
          <Field label="Category">
            <select value={form.category} onChange={(e) => set('category', e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-200 focus:border-violet-400/40 focus:outline-none">
              {CATEGORIES.slice(1).map((c) => <option key={c.id} value={c.label} className="bg-[#101119]">{c.label}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Description">
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="What does your agent do?" rows={3} className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" />
        </Field>

        <Field label="Capabilities">
          <div className="rounded-xl border border-white/10 bg-black/30 px-2.5 py-2">
            <div className="flex flex-wrap gap-1.5">
              {form.capabilities.map((c) => <span key={c} className="flex items-center gap-1 rounded-lg bg-violet-500/15 px-2 py-0.5 text-[11px] text-violet-200">{c}<button type="button" onClick={() => removeCap(c)}><X className="h-3 w-3" /></button></span>)}
              <input value={capInput} onChange={(e) => setCapInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCap(); } }} placeholder="Add a capability…" className="flex-1 bg-transparent text-xs text-zinc-200 placeholder:text-zinc-600 outline-none" />
              {capInput && <button type="button" onClick={addCap} className="rounded-lg bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-300"><Plus className="inline h-3 w-3" /> Add</button>}
            </div>
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Pricing">
            <select value={form.pricing} onChange={(e) => set('pricing', e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-200 focus:border-violet-400/40 focus:outline-none">
              {['Free','$9/mo','$19/mo','$29/mo','$49/mo','Custom'].map((p) => <option key={p} value={p} className="bg-[#101119]">{p}</option>)}
            </select>
          </Field>
          <Field label="Documentation URL"><input value={form.documentation} onChange={(e) => set('documentation', e.target.value)} placeholder="https://docs…" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" /></Field>
        </div>

        <Field label="Icon">
          <div className="flex flex-wrap gap-2">
            {GRADS.map((g) => (
              <button type="button" key={g} onClick={() => set('icon', g)} className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${g} ${form.icon === g ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0d0e15]' : 'opacity-70 hover:opacity-100'}`}>
                {form.name ? form.name.slice(0, 2).toUpperCase() : <ImagePlus className="h-4 w-4 text-white" />}
              </button>
            ))}
          </div>
        </Field>

        <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-900/30 hover:opacity-90">
          <Sparkles className="h-4 w-4" /> Publish agent
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return <div><label className="mb-1.5 block text-[11px] font-medium text-zinc-400">{label}</label>{children}</div>;
}