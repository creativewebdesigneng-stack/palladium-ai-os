import { Star, Download, Tag, Lock } from 'lucide-react';

export default function PluginCard({ plugin, onOpen, onInstall, installed }) {
  const I = plugin.icon;
  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[.03] p-4 transition hover:bg-white/[.05]">
      <button onClick={() => onOpen(plugin)} className="flex items-start gap-3 text-left">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${plugin.grad} text-white`}><I className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-white">{plugin.name}</h3>
          <p className="text-[10px] text-zinc-500">by {plugin.creator}</p>
        </div>
      </button>

      <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-xs text-zinc-400">{plugin.description}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-zinc-500">
        <span className="flex items-center gap-0.5 text-amber-400"><Star className="h-3 w-3 fill-amber-400" />{plugin.rating}</span>
        <span className="flex items-center gap-0.5"><Download className="h-3 w-3" />{plugin.installs}</span>
        <span className="flex items-center gap-0.5"><Tag className="h-3 w-3" />v{plugin.version}</span>
        <span className="flex items-center gap-0.5"><Lock className="h-3 w-3" />{plugin.permissions.length} perms</span>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${plugin.price === 'Free' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-violet-400/10 text-violet-300'}`}>{plugin.price}</span>
        <div className="flex gap-1">
          <button onClick={() => onOpen(plugin)} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-300 hover:bg-white/5">Details</button>
          <button onClick={() => onInstall(plugin)} className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium ${installed ? 'bg-emerald-500/15 text-emerald-300' : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white'}`}>{installed ? 'Installed' : 'Install'}</button>
        </div>
      </div>
    </div>
  );
}