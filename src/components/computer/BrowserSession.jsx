import { ArrowLeft, ArrowRight, RotateCw, Plus, X, Lock, Globe } from 'lucide-react';
import { BROWSER_TABS, MOCK_PAGE } from './computerData';

export default function BrowserSession({ tabs, activeTab, setActive, onNav, action }) {
  const tab = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c0d13]">
      {/* tab strip */}
      <div className="flex items-center gap-1 border-b border-white/10 bg-black/40 px-2 py-1.5">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActive(t.id)} className={`group flex max-w-[180px] items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] transition ${t.id === activeTab ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5'}`}>
            <Globe className="h-3 w-3 shrink-0 text-zinc-500" />
            <span className="truncate">{t.title}</span>
            <span className="ml-1 rounded p-0.5 text-zinc-500 opacity-0 transition group-hover:opacity-100"><X className="h-3 w-3" /></span>
          </button>
        ))}
        <button onClick={onNav.newTab} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5"><Plus className="h-3.5 w-3.5" /></button>
      </div>

      {/* toolbar */}
      <div className="flex items-center gap-1 border-b border-white/10 bg-black/20 px-2 py-1.5">
        <button onClick={onNav.back} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5"><ArrowLeft className="h-4 w-4" /></button>
        <button onClick={onNav.forward} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5"><ArrowRight className="h-4 w-4" /></button>
        <button onClick={onNav.refresh} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5"><RotateCw className="h-4 w-4" /></button>
        <div className="relative flex-1">
          <Lock className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-emerald-400" />
          <input value={tab.url} readOnly className="w-full rounded-lg border border-white/10 bg-black/30 py-1.5 pl-8 pr-3 text-[11px] text-zinc-300 outline-none" />
        </div>
        <button onClick={onNav.close} className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-400/10 hover:text-rose-300"><X className="h-4 w-4" /></button>
      </div>

      {/* page preview */}
      <div className="relative h-72 overflow-hidden bg-gradient-to-b from-white/[.04] to-transparent p-4">
        <div className="mx-auto max-w-sm rounded-xl border border-white/10 bg-[#10121a] p-4 shadow-2xl">
          <p className="mb-3 text-xs font-semibold text-white">{MOCK_PAGE.title}</p>
          <div className="space-y-2">
            {MOCK_PAGE.rows.map((r, i) => {
              if (r.type === 'hero') return <div key={i} className="h-16 rounded-lg bg-gradient-to-r from-violet-600/30 to-indigo-600/30" />;
              if (r.type === 'button') return (
                <div key={i} className={`mt-2 flex items-center justify-center rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 py-2 text-[11px] font-medium text-white ${action === 'Clicking button' ? 'ring-2 ring-violet-300/60' : ''}`}>{r.label}</div>
              );
              return (
                <div key={i} className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                  <span className="text-[11px] text-zinc-400">{r.label}</span>
                  <span className={`text-[11px] font-medium ${r.type === 'total' ? 'text-white' : 'text-zinc-300'}`}>{r.value}</span>
                </div>
              );
            })}
          </div>
        </div>
        <span className="absolute bottom-2 right-3 text-[9px] text-zinc-600">simulated preview</span>
      </div>
    </div>
  );
}