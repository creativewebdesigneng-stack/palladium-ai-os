import { ENV } from './terminalData';

const SCOPE_STYLE = {
  system: 'text-sky-400 bg-sky-400/10',
  session: 'text-violet-400 bg-violet-400/10',
  app: 'text-emerald-400 bg-emerald-400/10',
  secret: 'text-amber-400 bg-amber-400/10',
};

export default function EnvironmentView() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/60">
      <div className="border-b border-white/10 px-3 py-2 text-[11px] font-semibold text-white">Environment <span className="ml-1 text-zinc-500">({ENV.length})</span></div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {ENV.map((v) => (
          <div key={v.key} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[.02] px-3 py-2">
            <span className={`shrink-0 rounded px-1.5 py-px text-[9px] font-medium uppercase ${SCOPE_STYLE[v.scope]}`}>{v.scope}</span>
            <span className="shrink-0 font-mono text-[11px] font-semibold text-zinc-200">{v.key}</span>
            <span className="truncate font-mono text-[11px] text-zinc-400">{v.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}