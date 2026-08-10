import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { SIDEBAR_PROVIDERS } from './modelsData';

export default function ModelsSidebar({ active, onSelect }) {
  const [q, setQ] = useState('');
  const list = SIDEBAR_PROVIDERS.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));
  const connected = list.filter(p => p.connected);
  const available = list.filter(p => !p.connected);

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-4">
      <div className="rounded-2xl border border-white/10 bg-white/[.035] p-3">
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-2">
          <Search className="h-4 w-4 text-zinc-600" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search providers" className="w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600" />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[.035] p-3">
        <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-400">Connected · {connected.length}</p>
        <div className="space-y-0.5">
          <Item label="All Providers" active={active === 'all'} onClick={() => onSelect('all')} dot />
          {connected.map(p => (
            <Item key={p.id} label={p.name} sub={p.short} active={active === p.id} onClick={() => onSelect(p.id)} connected />
          ))}
        </div>
        <p className="mb-2 mt-4 px-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Available · {available.length}</p>
        <div className="space-y-0.5">
          {available.map(p => (
            <Item key={p.id} label={p.name} sub={p.short} active={active === p.id} onClick={() => onSelect(p.id)} />
          ))}
        </div>
      </div>
    </aside>
  );
}

function Item({ label, sub, active, onClick, connected, dot }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition ${active ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}`}>
      {dot ? <span className="h-2 w-2 rounded-full bg-gradient-to-r from-violet-400 to-cyan-400" /> : connected ? <span className="h-2 w-2 rounded-full bg-emerald-400" /> : <span className="h-2 w-2 rounded-full bg-zinc-600" />}
      <span className="flex-1 truncate">{label}</span>
      {sub && <span className="text-[10px] text-zinc-600">{sub}</span>}
    </button>
  );
}