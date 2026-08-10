import { useState } from 'react';
import { X, Upload, Star } from 'lucide-react';
import { CATEGORIES } from './templatesData';

export default function PublishTemplate({ onClose, onPublish }) {
  const [form, setForm] = useState({ name: '', desc: '', category: 'Websites', price: 'Free', previewUrl: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    onPublish({
      name: form.name || 'Untitled template',
      desc: form.desc,
      category: form.category,
      creator: 'You',
      rating: 0,
      uses: 0,
      price: form.price || 'Free',
      grad: 'from-violet-500 to-indigo-500',
      preview: { hero: form.name || 'Untitled template', sections: ['Preview'] },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button className="absolute inset-0 bg-black/60" onClick={onClose} />
      <form onSubmit={submit} className="relative flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#0c0d13]">
        <div className="flex items-center gap-2 border-b border-white/10 p-4">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500"><Upload className="h-4 w-4 text-white" /></span>
          <p className="text-sm font-semibold text-white">Publish your template</p>
          <button type="button" onClick={onClose} className="ml-auto text-zinc-500 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          <Field label="Template name"><input value={form.name} onChange={e => set('name', e.target.value)} placeholder="My template" className="input" /></Field>
          <Field label="Description"><textarea value={form.desc} onChange={e => set('desc', e.target.value)} rows={3} placeholder="What does this template do?" className="input" /></Field>
          <Field label="Category">
            <select value={form.category} onChange={e => set('category', e.target.value)} className="input">{CATEGORIES.map(c => <option key={c} value={c} className="bg-[#10121a]">{c}</option>)}</select>
          </Field>
          <Field label="Price"><input value={form.price} onChange={e => set('price', e.target.value)} placeholder="Free or $49" className="input" /></Field>
          <Field label="Preview image URL (optional)"><input value={form.previewUrl} onChange={e => set('previewUrl', e.target.value)} placeholder="https://…" className="input" /></Field>
          <p className="flex items-center gap-1.5 rounded-lg border border-amber-400/20 bg-amber-400/[.06] px-2.5 py-1.5 text-[10px] text-amber-200/90"><Star className="h-3 w-3" />New templates start with 0 rating and 0 uses.</p>
        </div>
        <div className="border-t border-white/10 p-3">
          <button type="submit" className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-violet-500 py-2.5 text-sm font-medium text-white hover:bg-violet-600"><Upload className="h-4 w-4" />Publish template</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return <label className="block"><span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</span>{children}</label>;
}