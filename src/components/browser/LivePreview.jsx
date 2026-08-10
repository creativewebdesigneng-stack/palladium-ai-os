import { DEVICES } from './browserData';

// Mock rendered page. The real app would iframe a live build URL.
export default function LivePreview({ url, device }) {
  const d = DEVICES[device];
  return (
    <div className="flex h-full items-start justify-center overflow-auto bg-black/30 p-4">
      <div
        className="overflow-hidden rounded-xl border border-white/10 bg-white shadow-2xl transition-all"
        style={{ width: d.w, height: d.h, maxWidth: '100%' }}
      >
        <div className="flex items-center gap-1.5 border-b border-zinc-200 bg-zinc-100 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="ml-2 truncate text-[10px] text-zinc-500">{url}</span>
        </div>
        <div className="bg-gradient-to-b from-white to-zinc-50 p-6 text-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-violet-600">Palladium</span>
            <div className="flex gap-3 text-[10px] text-zinc-500">
              <span>Agents</span><span>Workflows</span><span>Settings</span>
            </div>
          </div>
          <h1 className="mt-6 text-xl font-bold">Welcome back</h1>
          <p className="mt-1 text-[11px] text-zinc-500">Your agents are running smoothly.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[['Active agents', '12'], ['Tasks today', '48'], ['Tokens used', '2.4M'], ['Errors', '3']].map(([l, v]) => (
              <div key={l} className="rounded-lg border border-zinc-200 p-3">
                <p className="text-[9px] uppercase text-zinc-400">{l}</p>
                <p className="text-base font-semibold text-zinc-900">{v}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg bg-violet-600 px-3 py-2 text-center text-[11px] font-medium text-white">Run agent</div>
        </div>
      </div>
    </div>
  );
}