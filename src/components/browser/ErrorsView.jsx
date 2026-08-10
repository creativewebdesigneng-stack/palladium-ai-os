import { ERRORS } from './browserData';

export default function ErrorsView() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/60">
      <div className="border-b border-white/10 px-3 py-2 text-[11px] font-semibold text-white">Errors <span className="ml-1 text-rose-400">({ERRORS.length})</span></div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {ERRORS.map((e) => (
          <div key={e.id} className="rounded-xl border border-rose-400/20 bg-rose-500/5 p-3">
            <div className="flex items-center gap-2">
              <span className="rounded bg-rose-500/20 px-1.5 py-px text-[9px] font-medium uppercase text-rose-300">{e.sev}</span>
              <span className="text-[11px] font-semibold text-rose-200">{e.title}</span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-300">{e.msg}</p>
            <p className="mt-1 font-mono text-[10px] text-amber-400">{e.file}:{e.line}</p>
            <pre className="mt-1 whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-zinc-500">{e.stack}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}