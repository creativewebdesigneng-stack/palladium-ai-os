import { Database, Plug } from 'lucide-react';
import { VECTOR_PROVIDERS } from './vectorProviders';

export default function VectorPanel() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Database className="h-4 w-4 text-violet-400" />
        <h3 className="text-sm font-semibold text-white">Vector databases</h3>
        <span className="ml-auto rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400">{VECTOR_PROVIDERS.length} providers</span>
      </div>
      <p className="mb-3 text-[11px] text-zinc-500">Memories can be embedded into a vector store for semantic search. The schema is ready — connect a provider to activate live indexing.</p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {VECTOR_PROVIDERS.map((p) => (
          <div key={p.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600"><Database className="h-3.5 w-3.5 text-white" /></span>
              <p className="text-xs font-medium text-white">{p.name}</p>
              <span className="ml-auto flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400"><Plug className="h-3 w-3" />Not connected</span>
            </div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-zinc-500">{p.desc}</p>
            <p className="mt-1.5 text-[10px] text-zinc-600">Secret: <code className="text-zinc-400">{p.envKey}</code></p>
          </div>
        ))}
      </div>
    </div>
  );
}