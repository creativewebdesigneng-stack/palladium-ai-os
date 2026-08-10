import { AnimatePresence, motion } from 'framer-motion';
import { X, BookOpen, Zap, Gauge, Layers, Clock, Check, ExternalLink } from 'lucide-react';
import { BENCHMARKS, EXAMPLE_PROMPTS, BEST_USE_CASES } from './modelsData';

export default function ModelDetailsDrawer({ model, onClose }) {
  return (
    <AnimatePresence>
      {model && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 240 }}
            onClick={e => e.stopPropagation()}
            className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-white/10 bg-[#0c0d13] shadow-2xl"
          >
            <Header model={model} onClose={onClose} />
            <Body model={model} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Header({ model, onClose }) {
  return (
    <div className="relative flex items-start justify-between border-b border-white/10 p-5">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent" />
      <div className="relative flex items-center gap-3">
        <span className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${model.grad} text-sm font-bold text-white`}>{model.name.slice(0, 2)}</span>
        <div>
          <h2 className="text-lg font-semibold text-white">{model.name}</h2>
          <p className="text-xs text-zinc-500">{model.provider} · {model.status}</p>
        </div>
      </div>
      <button onClick={onClose} className="relative rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white"><X className="h-5 w-5" /></button>
    </div>
  );
}

function Body({ model }) {
  return (
    <div className="flex-1 space-y-5 overflow-y-auto p-5">
      <Section icon={BookOpen} title="Overview">
        <p className="text-sm text-zinc-400">{model.name} by {model.provider} offers a {model.context} context window and excels at {model.uses.slice(0, 3).join(', ').toLowerCase()}. Current status: <span className="text-white">{model.status}</span>.</p>
      </Section>

      <Section icon={Layers} title="Capabilities">
        <div className="grid grid-cols-2 gap-2">
          {[['Vision', model.vision], ['Voice', model.voice], ['Image Gen', model.image], ['Function Calling', model.tools], ['Streaming', model.streaming], ['Reasoning', true]].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-xs">
              <span className="text-zinc-400">{k}</span>
              {v ? <Check className="h-4 w-4 text-emerald-400" /> : <X className="h-4 w-4 text-zinc-600" />}
            </div>
          ))}
        </div>
      </Section>

      <Section icon={Gauge} title="Benchmarks">
        <div className="space-y-2">
          {Object.entries(BENCHMARKS).map(([k, v]) => (
            <div key={k}>
              <div className="flex justify-between text-xs"><span className="text-zinc-400">{k}</span><span className="text-white">{v}%</span></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${v}%` }} /></div>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={Zap} title="Pricing">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-white/5 bg-black/20 p-3"><p className="text-[10px] uppercase text-zinc-500">Input / 1M tokens</p><p className="text-lg font-semibold text-white">${model.priceIn}</p></div>
          <div className="rounded-lg border border-white/5 bg-black/20 p-3"><p className="text-[10px] uppercase text-zinc-500">Output / 1M tokens</p><p className="text-lg font-semibold text-white">${model.priceOut}</p></div>
        </div>
      </Section>

      <Section icon={Clock} title="Token Limits & Latency">
        <div className="grid grid-cols-3 gap-2 text-center">
          {[['Context', model.context], ['Max Output', '64K'], ['Avg Latency', '412ms']].map(([l, v]) => (
            <div key={l} className="rounded-lg border border-white/5 bg-black/20 py-3"><p className="text-sm font-semibold text-white">{v}</p><p className="text-[10px] uppercase text-zinc-500">{l}</p></div>
          ))}
        </div>
      </Section>

      <Section icon={Check} title="Best Use Cases">
        <div className="flex flex-wrap gap-1.5">
          {BEST_USE_CASES.map(u => <span key={u} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300">{u}</span>)}
        </div>
      </Section>

      <Section icon={BookOpen} title="Example Prompts">
        <div className="space-y-1.5">
          {EXAMPLE_PROMPTS.map(p => <div key={p} className="rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-xs text-zinc-400">{p}</div>)}
        </div>
      </Section>

      <a href="#" className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm text-zinc-300 hover:bg-white/10">
        <ExternalLink className="h-4 w-4" />View documentation
      </a>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5"><Icon className="h-3.5 w-3.5 text-violet-400" /><h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{title}</h3></div>
      {children}
    </div>
  );
}