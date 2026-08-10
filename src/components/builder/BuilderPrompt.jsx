import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Send, Play } from 'lucide-react';
import { EXAMPLE_PROMPTS, PROMPT_TOOLS } from './builderData';

export default function BuilderPrompt() {
  const [value, setValue] = useState('');
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/10 via-[#0c0d13] to-cyan-500/10 p-5 backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(139,92,246,.18),transparent_55%)]" />
      <div className="relative">
        <div className="mb-3 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-[0_0_24px_rgba(139,92,246,.4)]"><Sparkles className="h-5 w-5 text-white" /></span>
          <div>
            <h2 className="text-sm font-semibold text-white">What would you like to build today?</h2>
            <p className="text-[11px] text-zinc-500">Describe your idea — your AI workforce will plan, design, build and deploy it.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
          <textarea
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="What would you like to build today?"
            rows={3}
            className="w-full resize-none bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
          />
          {/* Tool bar */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-white/5 pt-2.5">
            {PROMPT_TOOLS.map(t => (
              <button key={t.label} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-zinc-300 hover:bg-white/10">
                <t.icon className="h-3.5 w-3.5 text-violet-400" />{t.label}
              </button>
            ))}
            <div className="ml-auto flex gap-1.5">
              <button className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-zinc-300 hover:bg-white/5"><Play className="h-3.5 w-3.5" />Generate Plan</button>
              <button className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3.5 py-1.5 text-[11px] font-medium text-white hover:opacity-90"><Send className="h-3.5 w-3.5" />Start Building</button>
            </div>
          </div>
        </div>

        {/* Example prompts */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {EXAMPLE_PROMPTS.map(p => (
            <button key={p} onClick={() => setValue(p)} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-zinc-400 hover:border-violet-400/30 hover:text-violet-300">
              {p}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}