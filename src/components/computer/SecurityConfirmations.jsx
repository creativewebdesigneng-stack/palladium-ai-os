import { ShieldCheck } from 'lucide-react';
import { SECURITY_CONFIRMATIONS } from './computerData';

export default function SecurityConfirmations({ settings, onChange }) {
  const toggle = (id) => onChange(settings.map((s) => s.id === id ? { ...s, on: !s.on } : s));
  const onCount = settings.filter((s) => s.on).length;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-emerald-400" />
        <h3 className="text-sm font-semibold text-white">Security confirmations</h3>
        <span className="ml-auto text-[10px] text-zinc-500">{onCount}/{settings.length} required</span>
      </div>
      <div className="space-y-2">
        {settings.map((s) => { const I = s.icon; return (
          <div key={s.id} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
            <I className="h-4 w-4 shrink-0 text-zinc-400" />
            <span className="flex-1 text-xs text-zinc-200">{s.label}</span>
            <Toggle on={s.on} onClick={() => toggle(s.id)} />
          </div>
        ); })}
      </div>
    </div>
  );
}

function Toggle({ on, onClick }) {
  return (
    <button onClick={onClick} className={`relative h-5 w-9 shrink-0 rounded-full transition ${on ? 'bg-gradient-to-r from-emerald-600 to-teal-600' : 'bg-white/10'}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${on ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  );
}