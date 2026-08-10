import { motion } from 'framer-motion';
import { X, Database, Check } from 'lucide-react';
import { VECTOR_PROVIDERS } from './vectorProviders';

export default function VectorIndexModal({ open, onClose, onIndex, entry, indexing }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="absolute left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#0b0c12] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Index to vector database</h2>
            <p className="text-[10px] text-zinc-500">Choose a provider for this memory.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
        </div>

        {entry?.vector_status === 'indexed' && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-300">
            <Check className="h-3.5 w-3.5" />Already indexed to {entry.vector_provider}.
          </div>
        )}

        <div className="space-y-2">
          {VECTOR_PROVIDERS.map((p) => (
            <button key={p.id} disabled={indexing} onClick={() => onIndex(p.id)}
              className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-left transition hover:border-violet-400/30 hover:bg-white/5 disabled:opacity-50">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600"><Database className="h-4 w-4 text-white" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">{p.name}</p>
                <p className="truncate text-[11px] text-zinc-500">{p.desc}</p>
              </div>
              {entry?.vector_provider === p.id && entry?.vector_status === 'indexed'
                ? <span className="rounded bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-400">Indexed</span>
                : <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400">Queue</span>}
            </button>
          ))}
        </div>

        <p className="mt-3 text-[10px] text-zinc-600">Memories are queued until a provider's API key is configured. Live indexing activates automatically once credentials are added.</p>
      </motion.div>
    </div>
  );
}