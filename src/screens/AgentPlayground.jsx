import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Send, ArrowLeft, Brain, Wrench, Loader2 } from 'lucide-react';
import { getAgentRuntime } from '@/lib/runtime/runtime.functions';
import { runAgentTask } from '@/lib/runtime/runtime.functions';
import { getUsageBreakdown } from '@/lib/usage/usage.functions';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { friendlyMessage } from '@/lib/errors';

function fmtMs(ms) {
  if (ms == null) return '—';
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

export default function AgentPlayground() {
  const { id } = useParams();
  const { toast } = useToast();
  const [authed, setAuthed] = useState(null);
  const [agent, setAgent] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(Boolean(data?.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setAuthed(Boolean(session)));
    return () => sub?.subscription?.unsubscribe();
  }, []);

  const load = useCallback(async () => {
    try {
      const [runtime, breakdown] = await Promise.all([
        getAgentRuntime({ data: { agent_id: id } }),
        getUsageBreakdown({ data: { agentId: id, range: '30d' } }).catch(() => null),
      ]);
      setAgent(runtime.agent);
      setTasks(runtime.tasks || []);
      setUsage(breakdown);
      const history = (runtime.tasks || [])
        .slice()
        .reverse()
        .flatMap((t) => [
          { role: 'user', text: t.input },
          t.output_text || t.error ? { role: 'agent', text: t.output_text || `Error: ${t.error}` } : null,
        ])
        .filter(Boolean);
      setMessages(history);
      setError('');
    } catch (e) {
      console.error('[agent-playground]', e);
      setError(friendlyMessage(e));
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (authed !== true) {
      if (authed === false) setLoading(false);
      return;
    }
    load();
  }, [authed, load]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setMessages((m) => [...m, { role: 'user', text }]);
    setInput('');
    setSending(true);
    try {
      const res = await runAgentTask({ data: { agent_id: id, input: text } });
      setMessages((m) => [...m, { role: 'agent', text: res.output || res.task?.error || 'No output produced.' }]);
      await load();
    } catch (e) {
      console.error('[agent-playground:send]', e);
      const msg = friendlyMessage(e);
      setMessages((m) => [...m, { role: 'agent', text: `⚠️ ${msg}` }]);
      toast({ title: 'Run failed', description: msg, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  if (authed === false) return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-8 text-sm text-zinc-400">
      Sign in to use the playground. <Link to="/login" className="text-violet-400">Go to sign in</Link>
    </div>
  );
  if (loading) return <div className="flex items-center gap-2 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" />Loading agent…</div>;
  if (!agent) return (
    <div className="text-sm text-zinc-500">{error || 'Agent not found.'} <Link to="/agents" className="text-violet-400">Back to agents</Link></div>
  );

  const totals = usage?.totals;
  const lastTask = tasks[0];

  return (
    <>
      <div className="mb-4"><Link to={`/agents/${agent.id}`} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" />Back to {agent.name}</Link></div>
      <div className="grid h-[calc(100vh-160px)] min-h-[600px] overflow-hidden rounded-2xl border border-white/10 bg-white/[.025] lg:grid-cols-[1fr_340px]">
        <section className="flex min-w-0 flex-col">
          <div className="border-b border-white/10 px-5 py-3"><p className="text-sm font-medium">Playground · {agent.name}</p><p className="text-[10px] text-zinc-500">Direct conversation with this agent</p></div>
          <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto p-5">
            {messages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-500">No conversation yet — send a message to run this agent.</div>
            ) : messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
                {m.role === 'user' ? <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-violet-600 px-4 py-3 text-sm">{m.text}</div>
                  : <div className="text-sm leading-7 text-zinc-300"><span className="mr-1 text-[10px] text-violet-400">● {agent.name}</span><p className="mt-1 whitespace-pre-wrap">{m.text}</p></div>}
              </div>
            ))}
            {sending && <div className="flex items-center gap-2 text-xs text-zinc-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />{agent.name} is working…</div>}
          </div>
          <div className="p-4"><div className="flex items-end gap-2 rounded-2xl border border-white/15 bg-[#15161f] p-2">
            <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} rows={1} placeholder={`Message ${agent.name}...`} disabled={sending} className="max-h-32 min-h-10 flex-1 resize-none bg-transparent py-2 text-sm outline-none disabled:opacity-50" />
            <button onClick={send} disabled={sending || !input.trim()} className="rounded-xl bg-violet-600 p-2 text-white disabled:opacity-50">{sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}</button>
          </div></div>
        </section>
        <aside className="hidden flex-col gap-3 overflow-y-auto border-l border-white/10 p-4 lg:flex">
          <div className="rounded-xl border border-white/10 p-4"><p className="text-xs text-zinc-500">Last run duration</p><p className="mt-1 text-2xl font-semibold">{fmtMs(lastTask?.duration_ms)}</p></div>
          {!totals || (totals.tokensTotal === 0 && usage.toolExecutionCount === 0) ? (
            <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-zinc-500">No usage recorded yet for this agent. Run a task to see stats here.</div>
          ) : (
            <>
              <div className="rounded-xl border border-white/10 p-4">
                <p className="mb-3 text-xs text-zinc-500">Tool usage (last 30 days)</p>
                {usage.toolUsage.length === 0 ? (
                  <p className="text-[11px] text-zinc-600">No tool calls yet.</p>
                ) : (
                  <div className="space-y-2">{usage.toolUsage.map((t) => (
                    <div key={t.tool} className="flex items-center gap-2 text-xs"><Wrench className="h-3.5 w-3.5 text-violet-400" />{t.tool}<span className="ml-auto text-zinc-500">{t.count}×</span></div>
                  ))}</div>
                )}
              </div>
              <div className="rounded-xl border border-white/10 p-4">
                <p className="mb-3 text-xs text-zinc-500">Performance (last 30 days)</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    ['Avg latency', fmtMs(totals.avgDurationMs)],
                    ['Tokens', totals.tokensTotal.toLocaleString()],
                    ['Runs', usage.taskCount],
                    ['Completed', totals.completed],
                  ].map(([k, v]) => <div key={k}><p className="text-zinc-600">{k}</p><p className="text-zinc-200">{v}</p></div>)}
                </div>
              </div>
            </>
          )}
          <div className="rounded-xl border border-white/10 p-4"><p className="mb-3 text-xs text-zinc-500">Recent runs</p>
            {tasks.length === 0 ? <p className="text-[11px] text-zinc-600">No runs yet.</p> : (
              <div className="space-y-2 text-xs text-zinc-400">{tasks.slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-center gap-2"><Brain className="h-3.5 w-3.5 text-cyan-400" /><span className="truncate">{t.title || t.input?.slice(0, 30) || 'Task'}</span><span className="ml-auto text-zinc-600">{t.status}</span></div>
              ))}</div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
