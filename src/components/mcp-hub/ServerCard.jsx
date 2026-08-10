import { Wrench, ShieldCheck, Download, Check } from 'lucide-react';
import { SECURITY } from './mcpData';

export default function ServerCard({ server, onInstall, onOpen }) {
  const sec = SECURITY[server.security];
  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[.03] p-4 hover:border-violet-400/30">
      <div className="flex items-start gap-2">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${server.grad} text-sm font-semibold text-white`}>{server.name[0]}</span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14px] font-semibold text-white">{server.name}</h3>
          <p className="text-[11px] text-zinc-500">{server.creator} · v{server.version}</p>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] ${sec.cls}`}><ShieldCheck className="mr-1 inline h-2.5 w-2.5" />{sec.label}</span>
      </div>
      <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-zinc-400">{server.desc}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <span className="rounded-md border border-white/10 bg-black/20 px-1.5 py-0.5 text-[10px] text-zinc-400">{server.category}</span>
        <span className="flex items-center gap-1 rounded-md border border-white/10 bg-black/20 px-1.5 py-0.5 text-[10px] text-zinc-400"><Wrench className="h-2.5 w-2.5" />{server.tools.length} tools</span>
      </div>
      <p className="mt-2 text-[10px] text-zinc-600">Tools: {server.tools.slice(0,3).join(', ')}{server.tools.length>3?'…':''}</p>
      <div className="mt-3 grid grid-cols-2 gap-1.5 border-t border-white/5 pt-3">
        <button onClick={onOpen} className="rounded-lg border border-white/10 py-1.5 text-[10px] text-zinc-300 hover:bg-white/5">Details</button>
        {server.installed ? (
          <span className="flex items-center justify-center gap-1 rounded-lg border border-emerald-400/20 bg-emerald-400/10 py-1.5 text-[10px] text-emerald-300"><Check className="h-3 w-3" />Installed</span>
        ) : (
          <button onClick={onInstall} className="flex items-center justify-center gap-1 rounded-lg border border-violet-400/20 bg-violet-500/15 py-1.5 text-[10px] text-violet-200 hover:bg-violet-500/25"><Download className="h-3 w-3" />Install</button>
        )}
      </div>
    </div>
  );
}