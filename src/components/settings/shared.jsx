import { useState } from 'react';
import { motion } from 'framer-motion';

export function Panel({ icon: Icon, title, grad, desc, children, action }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[22px] border border-violet-300/10 bg-[linear-gradient(145deg,rgba(13,10,20,.9),rgba(6,6,10,.95))] p-5 shadow-[0_18px_60px_rgba(0,0,0,.18)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/20 to-transparent" />
      <div className="relative mb-5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-violet-300/15 bg-violet-400/[.07]"><Icon className="h-4 w-4 text-violet-300" /></span>
          <div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            {desc && <p className="text-[11px] text-zinc-500">{desc}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="relative">{children}</div>
    </motion.div>
  );
}

export function Field({ label, hint, children }) {
  return <div className="grid gap-1.5 sm:grid-cols-[10rem_1fr] sm:items-center"><div><p className="text-xs font-medium text-zinc-300">{label}</p>{hint && <p className="text-[10px] text-zinc-600">{hint}</p>}</div><div>{children}</div></div>;
}

export function TextInput({ value, onChange, placeholder, prefix }) {
  return <div className="flex items-center rounded-xl border border-violet-300/10 bg-black/30 px-3 focus-within:border-violet-300/35 focus-within:shadow-[0_0_0_3px_rgba(139,92,246,.04)]">{prefix && <span className="text-xs text-zinc-600">{prefix}</span>}<input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-transparent py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none" /></div>;
}

export function Select({ value, onChange, options }) {
  return <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-violet-300/10 bg-black/30 px-3 py-2 text-sm text-white focus:border-violet-300/35 focus:outline-none">{options.map((o) => <option key={o} value={o} className="bg-zinc-900">{o}</option>)}</select>;
}

export function TextArea({ value, onChange, rows = 3 }) {
  return <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className="w-full resize-none rounded-xl border border-violet-300/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-violet-300/35 focus:outline-none" />;
}

export function Toggle({ checked, onChange }) {
  return <button onClick={() => onChange(!checked)} className={`relative h-5 w-9 rounded-full border transition ${checked ? 'border-violet-300/30 bg-violet-400/50' : 'border-white/10 bg-white/[.06]'}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${checked ? 'left-[1.125rem]' : 'left-0.5'}`} /></button>;
}

export function ToggleRow({ label, desc, checked, onChange }) {
  return <div className="flex items-center justify-between rounded-xl border border-violet-300/[.08] bg-black/25 px-3.5 py-3"><div><p className="text-xs font-medium text-zinc-200">{label}</p>{desc && <p className="text-[10px] text-zinc-500">{desc}</p>}</div><Toggle checked={checked} onChange={onChange} /></div>;
}

export function SectionGrid({ children }) { return <div className="space-y-3">{children}</div>; }

export function SaveBar({ onSave, dirty }) {
  return <div className="flex items-center justify-between rounded-2xl border border-violet-300/10 bg-black/30 px-4 py-3"><p className="text-[11px] text-zinc-500">{dirty ? 'You have unsaved changes' : 'All changes saved'}</p><button onClick={onSave} disabled={!dirty} className={`rounded-xl px-5 py-2 text-sm font-medium ${dirty ? 'border border-violet-200/20 bg-violet-300 text-[#09070d] hover:bg-violet-200' : 'cursor-not-allowed border border-white/10 text-zinc-500'}`}>Save changes</button></div>;
}

export function useSettingsSlice(initial) {
  const [state, setState] = useState(initial);
  const update = (key, val) => setState((s) => ({ ...s, [key]: val }));
  return [state, update, setState];
}

export function NotConfigured({ icon: Icon, title, desc }) {
  return <div className="rounded-2xl border border-dashed border-violet-300/10 bg-black/20 p-8 text-center"><span className="mx-auto grid h-11 w-11 place-items-center rounded-xl border border-violet-300/10 bg-violet-400/[.035]"><Icon className="h-5 w-5 text-violet-300/70" /></span><h4 className="mt-3 text-sm font-semibold text-white">{title}</h4><p className="mx-auto mt-1 max-w-sm text-xs text-zinc-500">{desc}</p></div>;
}
