import { Search } from 'lucide-react';
import { CATEGORIES } from './integrationsData';

export default function IntegrationsSidebar({ activeCat, setActiveCat }) {
  return (
    <div className="space-y-0.5">
      <button onClick={() => setActiveCat(null)} className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition ${!activeCat ? 'bg-violet-500/15 text-white ring-1 ring-violet-400/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
        <span className="flex items-center gap-2"><span className="grid h-5 w-5 place-items-center rounded-md bg-white/5"><Search className="h-3 w-3" /></span>All Categories</span>
      </button>
      {CATEGORIES.map(c => (
        <button key={c.name} onClick={() => setActiveCat(c.name)} className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition ${activeCat === c.name ? 'bg-violet-500/15 text-white ring-1 ring-violet-400/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
          <span className="flex items-center gap-2"><span className={`grid h-5 w-5 place-items-center rounded-md bg-gradient-to-br ${c.grad}`}><c.icon className="h-3 w-3 text-white" /></span>{c.name}</span>
        </button>
      ))}
    </div>
  );
}