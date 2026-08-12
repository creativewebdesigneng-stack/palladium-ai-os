import { motion } from 'framer-motion';
import { ArrowRight, MessagesSquare, ShieldCheck } from 'lucide-react';
import { SectionHead, MiniAvatar } from './wfShared';

const TYPE_CLS = {
  handoff: 'bg-violet-500/15 text-violet-300',
  request: 'bg-amber-500/15 text-amber-300',
  result: 'bg-emerald-500/15 text-emerald-300',
  broadcast: 'bg-sky-500/15 text-sky-300',
};

function relTime(iso) {
  if (!iso) return '';
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return 'just now';
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function AgentCommsFeed({ messages, agents }) {
  const nameById = {};
  for (const a of agents || []) nameById[a.id] = a.name;

  return (
    <section className="mb-8">
      <SectionHead icon={MessagesSquare} title="Agent communication" desc="agent-to-agent handoffs recorded by the workforce engine" />

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Feed */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
            {messages.length ? (
              <div className="space-y-3">
                {messages.map((c, i) => (
                  <motion.div
                    key={c.id || i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5"
                  >
                    <MiniAvatar letter={(nameById[c.from_agent_id] || '?').charAt(0)} grad="from-violet-500 to-indigo-600" size="h-8 w-8" text="text-xs" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="font-medium text-white">{nameById[c.from_agent_id] || 'Workflow step'}</span>
                        <ArrowRight className="h-3 w-3 text-zinc-600" />
                        <span className="font-medium text-white">{nameById[c.to_agent_id] || 'All agents'}</span>
                        <span className={`ml-1.5 rounded px-1.5 py-0.5 text-[9px] ${TYPE_CLS[c.kind] || TYPE_CLS.handoff}`}>{c.kind}</span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-zinc-300">“{c.content}”</p>
                    </div>
                    <span className="shrink-0 text-[10px] text-zinc-600">{relTime(c.created_at)}</span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-10 text-center">
                <MessagesSquare className="mx-auto h-7 w-7 text-zinc-600" />
                <p className="mt-2 text-sm font-medium text-white">No messages yet</p>
                <p className="mt-1 text-xs text-zinc-500">Run a workflow — each handoff between agents is recorded here.</p>
              </div>
            )}
          </div>
        </div>

        {/* Policy note */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-white"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />Controlled handoffs</p>
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">
              Agents never read one another&apos;s private data. Every message above was written by the
              workforce engine as a declared step handoff, so an agent only ever receives the objective
              and the upstream outputs its workflow step depends on.
            </p>
            <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
              To create a handoff, add a step to a workflow in the orchestrator above and set its
              dependencies — messages cannot be injected from the browser.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
