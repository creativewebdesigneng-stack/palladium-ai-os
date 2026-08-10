import { useState } from 'react';
import { Pencil, Check, X, AlertTriangle, ShieldAlert } from 'lucide-react';

function ValueInput({ setting, value, onChange }) {
  if (setting.type === 'toggle') {
    return (
      <button onClick={() => onChange(!value)} className={`relative h-6 w-11 rounded-full transition ${value ? 'bg-violet-500' : 'bg-white/10'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${value ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    );
  }
  if (setting.type === 'select') {
    return (
      <select value={value} onChange={e => onChange(e.target.value)} className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs text-zinc-200 [&>option]:bg-[#10121a]">
        {setting.options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (setting.type === 'number') {
    return <input type="number" value={value} onChange={e => onChange(e.target.value)} className="w-28 rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs text-zinc-200 focus:border-violet-400/40 focus:outline-none" />;
  }
  if (setting.type === 'secret') {
    return <input type="password" value={value} onChange={e => onChange(e.target.value)} className="w-48 rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs text-zinc-200 focus:border-violet-400/40 focus:outline-none" />;
  }
  return <input type="text" value={value} onChange={e => onChange(e.target.value)} className="w-56 rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs text-zinc-200 focus:border-violet-400/40 focus:outline-none" />;
}

function DisplayValue({ setting, value }) {
  if (setting.type === 'toggle') return <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${value ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-zinc-400'}`}>{value ? 'Enabled' : 'Disabled'}</span>;
  if (setting.type === 'secret') return <code className="font-mono text-[12px] text-zinc-400">{value}</code>;
  return <span className="text-[13px] font-medium text-zinc-200">{String(value)}</span>;
}

function SettingCard({ setting, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(setting.value);
  const [confirming, setConfirming] = useState(false);

  const start = () => { setDraft(setting.value); setEditing(true); };
  const cancel = () => { setEditing(false); setConfirming(false); };
  const save = () => {
    if (setting.danger && !confirming) { setConfirming(true); return; }
    onSave(setting.id, draft);
    setEditing(false); setConfirming(false);
  };

  return (
    <div className={`rounded-2xl border bg-white/[.03] p-4 ${setting.danger ? 'border-rose-400/20' : 'border-white/10'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {setting.danger && <AlertTriangle className="h-3.5 w-3.5 text-rose-300" />}
            <p className="text-[13px] font-semibold text-white">{setting.name}</p>
          </div>
          <p className="mt-1 text-[12px] text-zinc-500">{setting.description}</p>
        </div>
        {!editing && (
          <button onClick={start} className="flex shrink-0 items-center gap-1 rounded-lg border border-white/10 px-2 py-1.5 text-[11px] text-zinc-300 hover:bg-white/5"><Pencil className="h-3 w-3" />Edit</button>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Current</span>
        {editing
          ? <ValueInput setting={setting} value={draft} onChange={setDraft} />
          : <DisplayValue setting={setting} value={setting.value} />}
      </div>

      {editing && (
        <div className="mt-3">
          {confirming && (
            <div className="mb-2 flex items-start gap-2 rounded-lg border border-rose-400/20 bg-rose-400/[.08] px-3 py-2 text-[11px] text-rose-200">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>This is a sensitive change. Confirm to apply <span className="font-semibold">{setting.name}</span>.</p>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <button onClick={save} className="flex items-center gap-1 rounded-lg bg-violet-500/20 px-2.5 py-1.5 text-[11px] font-medium text-violet-200 ring-1 ring-violet-400/20 hover:bg-violet-500/30">{confirming ? <><ShieldAlert className="h-3 w-3" />Confirm & Apply</> : <><Check className="h-3 w-3" />Save</>}</button>
            <button onClick={cancel} className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-300 hover:bg-white/5"><X className="h-3 w-3" />Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsSection({ section, values, onSave }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {section.cards.map(c => <SettingCard key={c.id} setting={{ ...c, value: values[c.id] }} onSave={onSave} />)}
    </div>
  );
}