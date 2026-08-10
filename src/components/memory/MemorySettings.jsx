import { Settings } from 'lucide-react';
import { MEMORY_SETTINGS } from './memoryData';

export default function MemorySettings({ settings, onChange }) {
  const toggle = (id) => onChange(settings.map((s) => s.id === id ? { ...s, on: !s.on } : s));
  const setRetention = (id, value) => onChange(settings.map((s) => s.id === id ? { ...s, value } : s));

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Settings className="h-4 w-4 text-violet-400" />
        <h3 className="text-sm font-semibold text-white">Memory settings</h3>
      </div>
      <div className="space-y-3">
        {settings.map((s) => (
          <div key={s.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-white">{s.label}</p>
                <p className="mt-0.5 text-[10px] text-zinc-500">{s.desc}</p>
              </div>
              <Toggle on={s.on} onClick={() => toggle(s.id)} />
            </div>
            {s.options && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {s.options.map((o) => (
                  <button key={o} onClick={() => setRetention(s.id, o)} className={`rounded-lg px-2 py-1 text-[10px] font-medium transition ${s.value === o ? 'bg-violet-500/15 text-violet-200 ring-1 ring-violet-400/30' : 'border border-white/10 text-zinc-400 hover:bg-white/5'}`}>
                    {o}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Toggle({ on, onClick }) {
  return (
    <button onClick={onClick} className={`relative h-5 w-9 shrink-0 rounded-full transition ${on ? 'bg-gradient-to-r from-violet-600 to-indigo-600' : 'bg-white/10'}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${on ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  );
}