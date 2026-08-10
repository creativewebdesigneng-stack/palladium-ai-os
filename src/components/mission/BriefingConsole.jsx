import { motion } from 'framer-motion';
import { Sparkles, Send, Loader2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { EXAMPLE_REQUESTS } from '@/lib/mission/catalog';
import NeuralField from './NeuralField';

export default function BriefingConsole({ briefing, loading, agents = [], submitting, onSubmit }) {
  const [request, setRequest] = useState('');
  const [agentId, setAgentId] = useState('');

  const send = (e) => {
    e?.preventDefault?.();
    const text = request.trim();
    if (!text || submitting) return;
    onSubmit?.({ request: text, agentId: agentId || null });
    setRequest('');
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0b0c13]/80 p-6 backdrop-blur-xl">
      <NeuralField />
      <div className="relative">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-300/80">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-violet-400/70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-400" />
          </span>
          Daily briefing
        </div>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 max-w-3xl text-lg font-medium leading-relaxed text-white sm:text-xl"
        >
          {loading ? 'Synchronising your agents…' : briefing}
        </motion.p>

        <form onSubmit={send} className="mt-6 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Sparkles className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-400" />
            <input
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              placeholder="Tell Mission Control what you need…"
              aria-label="Mission Control request"
              className="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-10 pr-3 text-sm text-white placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>
          <select
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            aria-label="Route to agent"
            className="rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-zinc-300 focus:border-violet-400/40 focus:outline-none"
          >
            <option value="">Auto-route agent</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <button
            type="submit"
            disabled={submitting || !request.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 transition hover:brightness-110 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Dispatch
          </button>
        </form>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {EXAMPLE_REQUESTS.slice(0, 6).map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setRequest(ex)}
              className="rounded-full border border-white/10 bg-white/[.03] px-3 py-1 text-[11px] text-zinc-400 transition hover:border-violet-400/30 hover:text-white"
            >
              {ex}
            </button>
          ))}
        </div>

        <p className="mt-4 flex items-center gap-1.5 text-[11px] text-zinc-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          Agents research and prepare. Anything involving money, bookings or messages waits for your explicit approval.
        </p>
      </div>
    </section>
  );
}
