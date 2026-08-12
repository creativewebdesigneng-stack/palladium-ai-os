import { useState } from 'react';
import { motion } from 'framer-motion';

export function Panel({ icon: Icon, title, grad, desc, children, action }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
      <div className="mb-5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${grad}`}><Icon className="h-4 w-4 text-white" /></span>
          <div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            {desc && <p className="text-[11px] text-zinc-500">{desc}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </motion.div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-[10rem_1fr] sm:items-center">
      <div>
        <p className="text-xs font-medium text-zinc-300">{label}</p>
        {hint && <p className="text-[10px] text-zinc-600">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

export function TextInput({ value, onChange, placeholder, prefix }) {
  return (
    <div className="flex items-center rounded-xl border border-white/10 bg-black/30 px-3 focus-within:border-violet-400/40">
      {prefix && <span className="text-xs text-zinc-600">{prefix}</span>}
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-transparent py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none" />
    </div>
  );
}

export function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:border-violet-400/40 focus:outline-none">
      {options.map((o) => <option key={o} value={o} className="bg-zinc-900">{o}</option>)}
    </select>
  );
}

export function TextArea({ value, onChange, rows = 3 }) {
  return (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows}
      className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" />
  );
}

export function Toggle({ checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 rounded-full transition ${checked ? 'bg-violet-500' : 'bg-white/10'}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${checked ? 'left-[1.125rem]' : 'left-0.5'}`} />
    </button>
  );
}

export function ToggleRow({ label, desc, checked, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3.5 py-3">
      <div>
        <p className="text-xs font-medium text-zinc-200">{label}</p>
        {desc && <p className="text-[10px] text-zinc-500">{desc}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

export function SectionGrid({ children }) {
  return <div className="space-y-3">{children}</div>;
}

export function SaveBar({ onSave, dirty }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
      <p className="text-[11px] text-zinc-500">{dirty ? 'You have unsaved changes' : 'All changes saved'}</p>
      <button onClick={onSave} disabled={!dirty}
        className={`rounded-xl px-5 py-2 text-sm font-medium ${dirty ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-900/30 hover:opacity-90' : 'cursor-not-allowed border border-white/10 text-zinc-500'}`}>
        Save Changes
      </button>
    </div>
  );
}

// Hook to manage a settings slice with dirty tracking.
export function useSettingsSlice(initial) {
  const [state, setState] = useState(initial);
  const update = (key, val) => setState((s) => ({ ...s, [key]: val }));
  return [state, update, setState];
}
export function NotConfigured({ icon: Icon, title, desc }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[.02] p-8 text-center">
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-white/5"><Icon className="h-5 w-5 text-zinc-500" /></span>
      <h4 className="mt-3 text-sm font-semibold text-white">{title}</h4>
      <p className="mx-auto mt-1 max-w-sm text-xs text-zinc-500">{desc}</p>
    </div>
  );
}
