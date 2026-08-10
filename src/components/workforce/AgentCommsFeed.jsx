import { motion } from 'framer-motion';
import { ArrowRight, MessagesSquare, Send } from 'lucide-react';
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

export default function AgentCommsFeed({ messages, agents, onSend, sending, form, setForm }) {
  const toDisabled = form.message_type === 'broadcast';

  const submit = () => {
    if (!form.from_agent_id || (!form.to_agent_id && !toDisabled) || !form.content.trim()) return;
    onSend();
  };

  return (
    <section className="mb-8">
      <SectionHead icon={MessagesSquare} title="Agent communication" desc="agent-to-agent handoffs & messages" />

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
                    <MiniAvatar letter={(c.from_agent_name || '?').charAt(0)} grad={c.from_grad || 'from-zinc-500 to-slate-600'} size="h-8 w-8" text="text-xs" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="font-medium text-white">{c.from_agent_name}</span>
                        <ArrowRight className="h-3 w-3 text-zinc-600" />
                        <span className="font-medium text-white">{c.to_agent_name || 'All agents'}</span>
                        <span className={`ml-1.5 rounded px-1.5 py-0.5 text-[9px] ${TYPE_CLS[c.message_type] || TYPE_CLS.handoff}`}>{c.message_type}</span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-zinc-300">“{c.content}”</p>
                    </div>
                    <span className="shrink-0 text-[10px] text-zinc-600">{relTime(c.created_date)}</span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-10 text-center">
                <MessagesSquare className="mx-auto h-7 w-7 text-zinc-600" />
                <p className="mt-2 text-sm font-medium text-white">No messages yet</p>
                <p className="mt-1 text-xs text-zinc-500">Send a handoff so one agent can forward findings to another.</p>
              </div>
            )}
          </div>
        </div>

        {/* Compose */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
            <p className="mb-3 text-xs font-semibold text-white">Send message</p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-600">From agent</label>
                <select value={form.from_agent_id} onChange={(e) => setForm({ ...form, from_agent_id: e.target.value })} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-200 focus:border-violet-400/40 focus:outline-none">
                  <option value="">Select sender…</option>
                  {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-600">Type</label>
                  <select value={form.message_type} onChange={(e) => setForm({ ...form, message_type: e.target.value })} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-200 focus:border-violet-400/40 focus:outline-none">
                    <option value="handoff">Handoff</option>
                    <option value="request">Request</option>
                    <option value="result">Result</option>
                    <option value="broadcast">Broadcast</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-600">To agent</label>
                  <select value={form.to_agent_id} disabled={toDisabled} onChange={(e) => setForm({ ...form, to_agent_id: e.target.value })} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-200 focus:border-violet-400/40 focus:outline-none disabled:opacity-50">
                    <option value="">{toDisabled ? 'All agents' : 'Select recipient…'}</option>
                    {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-600">Message</label>
                <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={3} placeholder="e.g. Research complete — findings attached for the report." className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" />
              </div>
              {form.message_type === 'handoff' && (
                <label className="flex items-center gap-2 text-[11px] text-zinc-400">
                  <input type="checkbox" checked={form.create_task !== false} onChange={(e) => setForm({ ...form, create_task: e.target.checked })} className="accent-violet-500" />
                  Create a pending task on the recipient
                </label>
              )}
              <button onClick={submit} disabled={sending} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
                <Send className="h-4 w-4" />{sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}