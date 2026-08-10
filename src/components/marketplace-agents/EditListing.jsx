import { useState } from 'react';
import { X, Loader2, Save } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { saveMarketplaceAgent, submitMarketplaceAgent } from './api';
import { CATEGORIES } from './marketplaceData';

const inp = 'w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none';
const GRADS = ['from-violet-500 to-indigo-500','from-sky-500 to-cyan-500','from-emerald-500 to-teal-500','from-fuchsia-500 to-pink-500','from-amber-500 to-orange-500','from-rose-500 to-red-500'];
const PLANS = [{ id: 'free', label: 'Free' }, { id: 'pro', label: 'Pro' }, { id: 'business', label: 'Business' }, { id: 'enterprise', label: 'Enterprise' }];

// Create or edit a marketplace agent listing. Full listing fields: name,
// description, category, version, features, price, required plan, usage
// requirements, revenue share, plus an agent template (provider/model/tools)
// stored in metadata for capability preview + future install. Saving creates
// a draft (or updates content); "Submit for review" moves a draft to
// pending_review via the submit backend function.
export default function EditListing({ item, onClose, onSaved }) {
  const { toast } = useToast();
  const isNew = !item.id;
  const m = item.metadata || {};
  const ac = m.agent_config || {};
  const [form, setForm] = useState({
    title: item.title || '',
    description: item.description || '',
    category: item.category || 'development',
    version: item.version || '1.0.0',
    features: item.features || [],
    price: Number(item.price) || 0,
    required_plan: item.required_plan || 'free',
    usage_requirements: item.usage_requirements || '',
    revenue_share: Number(item.revenue_share) || 30,
    provider: ac.provider || 'openai',
    model: ac.model || '',
    tools: ac.tools || [],
    grad: m.grad || GRADS[0],
  });
  const [capInput, setCapInput] = useState('');
  const [toolInput, setToolInput] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addCap = () => { const v = capInput.trim(); if (v && !form.features.includes(v)) set('features', [...form.features, v]); setCapInput(''); };
  const addTool = () => { const v = toolInput.trim(); if (v && !form.tools.includes(v)) set('tools', [...form.tools, v]); setToolInput(''); };

  const save = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || busy) return;
    setBusy(true);
    try {
      await saveMarketplaceAgent({
        item_id: item.id || undefined,
        title: form.title,
        description: form.description,
        category: form.category,
        version: form.version,
        features: form.features,
        price: form.price,
        required_plan: form.required_plan,
        usage_requirements: form.usage_requirements,
        revenue_share: form.revenue_share,
        metadata: {
          grad: form.grad,
          initials: form.title.slice(0, 2).toUpperCase(),
          agent_config: { provider: form.provider, model: form.model, tools: form.tools },
        },
      });
      toast({ title: isNew ? 'Draft created' : 'Listing updated' });
      onSaved?.();
    } catch (e) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await submitMarketplaceAgent({ item_id: item.id });
      toast({ title: 'Submitted for review' });
      onSaved?.();
    } catch (e) {
      toast({ title: 'Submit failed', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-[81] flex w-full max-w-lg flex-col overflow-y-auto border-l border-white/10 bg-[#0d0e15]">
        <div className="sticky top-0 flex items-center justify-between border-b border-white/10 bg-[#0d0e15]/95 px-5 py-4 backdrop-blur">
          <h2 className="text-base font-semibold text-white">{isNew ? 'New marketplace agent' : 'Edit agent'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={save} className="space-y-4 p-5">
          <Field label="Agent name"><input value={form.title} onChange={(e) => set('title', e.target.value)} required className={inp} /></Field>
          <Field label="Description"><textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} className={`${inp} resize-none`} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category"><select value={form.category} onChange={(e) => set('category', e.target.value)} className={inp}>{CATEGORIES.slice(1).map((c) => <option key={c.id} value={c.id} className="bg-[#101119]">{c.label}</option>)}</select></Field>
            <Field label="Version"><input value={form.version} onChange={(e) => set('version', e.target.value)} placeholder="1.0.0" className={inp} /></Field>
          </div>
          <Field label="Capabilities / features">
            <TagInput values={form.features} onAdd={addCap} input={capInput} setInput={setCapInput} onRemove={(c) => set('features', form.features.filter((x) => x !== c))} placeholder="Add a capability and press Enter" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Price (£/mo)"><input type="number" min="0" value={form.price} onChange={(e) => set('price', Number(e.target.value))} className={inp} /></Field>
            <Field label="Required plan"><select value={form.required_plan} onChange={(e) => set('required_plan', e.target.value)} className={inp}>{PLANS.map((p) => <option key={p.id} value={p.id} className="bg-[#101119]">{p.label}</option>)}</select></Field>
            <Field label="Revenue share %"><input type="number" min="0" max="100" value={form.revenue_share} onChange={(e) => set('revenue_share', Number(e.target.value))} className={inp} /></Field>
          </div>
          <Field label="Usage requirements"><textarea value={form.usage_requirements} onChange={(e) => set('usage_requirements', e.target.value)} rows={2} placeholder="e.g. Requires Pro plan + GitHub integration" className={`${inp} resize-none`} /></Field>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="mb-3 text-[11px] font-medium text-zinc-400">Agent template (capability preview + future install)</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Provider"><select value={form.provider} onChange={(e) => set('provider', e.target.value)} className={inp}>{['openai', 'anthropic', 'local'].map((p) => <option key={p} value={p} className="bg-[#101119]">{p}</option>)}</select></Field>
              <Field label="Model"><input value={form.model} onChange={(e) => set('model', e.target.value)} placeholder="Claude Sonnet 4.6" className={inp} /></Field>
            </div>
            <div className="mt-3"><Field label="Tools"><TagInput values={form.tools} onAdd={addTool} input={toolInput} setInput={setToolInput} onRemove={(t) => set('tools', form.tools.filter((x) => x !== t))} placeholder="Add a tool and press Enter" /></Field></div>
          </div>

          <Field label="Icon">
            <div className="flex flex-wrap gap-2">
              {GRADS.map((g) => (
                <button type="button" key={g} onClick={() => set('grad', g)} className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${g} ${form.grad === g ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0d0e15]' : 'opacity-70 hover:opacity-100'}`}>
                  <span className="text-[10px] font-semibold text-white">{form.title.slice(0, 2).toUpperCase() || 'AI'}</span>
                </button>
              ))}
            </div>
          </Field>

          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={busy} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isNew ? 'Create draft' : 'Save changes'}
            </button>
            {!isNew && (item.status === 'draft' || item.status === 'rejected') && (
              <button type="button" onClick={submit} disabled={busy} className="flex items-center justify-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-2.5 text-sm text-violet-200 hover:bg-violet-500/20 disabled:opacity-50">Submit for review</button>
            )}
          </div>
        </form>
      </aside>
    </>
  );
}

function Field({ label, children }) {
  return <div><label className="mb-1.5 block text-[11px] font-medium text-zinc-400">{label}</label>{children}</div>;
}

function TagInput({ values, onAdd, input, setInput, onRemove, placeholder }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 px-2.5 py-2">
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span key={v} className="flex items-center gap-1 rounded-lg bg-violet-500/15 px-2 py-0.5 text-[11px] text-violet-200">{v}<button type="button" onClick={() => onRemove(v)}><X className="h-3 w-3" /></button></span>
        ))}
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAdd(); } }} placeholder={placeholder} className="flex-1 bg-transparent text-xs text-zinc-200 placeholder:text-zinc-600 outline-none" />
      </div>
    </div>
  );
}