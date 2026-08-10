import { Globe, ExternalLink } from 'lucide-react';
import { SOURCES } from './webData';

export default function SourceCards({ loading }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-white">Sources <span className="text-zinc-500">({SOURCES.length})</span></h3>
      {loading ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-white/5" />)}
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SOURCES.map(s => (
            <a key={s.id} href={`https://${s.url}`} target="_blank" rel="noreferrer" className="group flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[.03] p-3 hover:border-violet-400/30">
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${s.favicon} text-white`}><Globe className="h-3.5 w-3.5" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-white group-hover:text-violet-300">{s.title}</p>
                <p className="truncate text-[10px] text-zinc-500">{s.url}</p>
                <p className="mt-1 line-clamp-2 text-[11px] text-zinc-400">{s.snippet}</p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}