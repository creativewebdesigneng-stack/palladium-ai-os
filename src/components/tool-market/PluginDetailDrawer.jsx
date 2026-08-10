import { Star, Download, Tag, X, Cpu, Lock, Bot, Workflow, FileText, History, MessageSquare, Play, Settings } from 'lucide-react';
import { useState } from 'react';

const TABS = [
  { id: 'capabilities', label: 'Capabilities', icon: Cpu },
  { id: 'permissions', label: 'Permissions', icon: Lock },
  { id: 'agents', label: 'Agents', icon: Bot },
  { id: 'workflows', label: 'Workflows', icon: Workflow },
  { id: 'docs', label: 'Documentation', icon: FileText },
  { id: 'reviews', label: 'Reviews', icon: MessageSquare },
  { id: 'versions', label: 'Version History', icon: History },
];

export default function PluginDetailDrawer({ plugin, onClose, onInstall, installed }) {
  const [tab, setTab] = useState('capabilities');
  if (!plugin) return null;
  const I = plugin.icon;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#0c0d13] shadow-2xl">
        <div className="flex items-start gap-3 border-b border-white/10 p-4">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${plugin.grad} text-white`}><I className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-white">{plugin.name}</h2>
            <p className="text-[10px] text-zinc-500">by {plugin.creator} · v{plugin.version}</p>
            <div className="mt-1 flex items-center gap-2 text-[10px] text-zinc-500">
              <span className="flex items-center gap-0.5 text-amber-400"><Star className="h-3 w-3 fill-amber-400" />{plugin.rating}</span>
              <span className="flex items-center gap-0.5"><Download className="h-3 w-3" />{plugin.installs}</span>
              <span className={`rounded-full px-1.5 py-0.5 font-medium ${plugin.price === 'Free' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-violet-400/10 text-violet-300'}`}>{plugin.price}</span>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-white/5"><X className="h-4 w-4" /></button>
        </div>

        <p className="px-4 py-3 text-xs text-zinc-400">{plugin.description}</p>

        <div className="flex gap-1.5 overflow-x-auto border-b border-white/10 px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => { const TI = t.icon; const active = tab === t.id; return (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${active ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5'}`}>
              <TI className="h-3 w-3" />{t.label}
            </button>
          ); })}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'capabilities' && <ul className="space-y-1.5">{plugin.capabilities.map((c) => <li key={c} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-300"><Cpu className="h-3.5 w-3.5 text-violet-400" />{c}</li>)}</ul>}
          {tab === 'permissions' && <ul className="space-y-1.5">{plugin.permissions.map((p) => <li key={p} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-300"><Lock className="h-3.5 w-3.5 text-amber-400" />{p}</li>)}</ul>}
          {tab === 'agents' && <div className="flex flex-wrap gap-1.5">{plugin.agents.map((a) => <span key={a} className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-zinc-200"><Bot className="h-3.5 w-3.5 text-violet-400" />{a}</span>)}</div>}
          {tab === 'workflows' && <ul className="space-y-1.5">{plugin.workflows.map((w) => <li key={w} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-300"><Workflow className="h-3.5 w-3.5 text-emerald-400" />{w}</li>)}</ul>}
          {tab === 'docs' && <pre className="whitespace-pre-wrap rounded-xl border border-white/10 bg-black/20 p-3 text-[11px] leading-relaxed text-zinc-300">{plugin.docs}</pre>}
          {tab === 'reviews' && <div className="space-y-2">{plugin.reviews.map((r, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white">{r.user}</span>
                <span className="flex items-center gap-0.5 text-amber-400">{Array.from({ length: 5 }).map((_, k) => <Star key={k} className={`h-3 w-3 ${k < r.score ? 'fill-amber-400' : 'fill-white/10'}`} />)}</span>
              </div>
              <p className="mt-1.5 text-[11px] text-zinc-400">{r.text}</p>
            </div>
          ))}</div>}
          {tab === 'versions' && <ul className="space-y-1.5">{plugin.versions.map((v, i) => <li key={v} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${i === 0 ? 'border-violet-400/30 bg-violet-500/10 text-violet-200' : 'border-white/10 bg-black/20 text-zinc-300'}`}><Tag className="h-3.5 w-3.5" />{v}{i === 0 && <span className="ml-auto text-[9px] uppercase">latest</span>}</li>)}</ul>}
        </div>

        <div className="flex gap-2 border-t border-white/10 p-4">
          <button className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 py-2.5 text-xs font-medium text-zinc-300 hover:bg-white/5"><Play className="h-3.5 w-3.5" />Try</button>
          <button className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 py-2.5 text-xs font-medium text-zinc-300 hover:bg-white/5"><Settings className="h-3.5 w-3.5" />Configure</button>
          <button onClick={() => onInstall(plugin)} className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium ${installed ? 'bg-emerald-500/15 text-emerald-300' : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white'}`}>{installed ? 'Installed' : 'Install'}</button>
        </div>
      </div>
    </div>
  );
}