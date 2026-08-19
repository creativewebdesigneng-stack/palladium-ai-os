import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Send, Loader2, ShieldCheck, Bot, User, AlertTriangle, Clock3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { EXAMPLE_REQUESTS } from '@/lib/mission/catalog';
import NeuralField from './NeuralField';

function taskReply(task) {
  const result = task?.result && typeof task.result === 'object' ? task.result : {};
  if (task?.status === 'completed') {
    return result.summary || 'Done — the task completed successfully.';
  }
  if (task?.status === 'failed') {
    return result.error || 'I could not complete that task. Please try again.';
  }
  if (task?.status === 'awaiting_approval' || task?.status === 'waiting_for_approval') {
    return 'I’ve prepared the next step, but it needs your approval before anything sensitive happens. Open the Approval centre to review it.';
  }
  if (task?.status === 'queued' || task?.status === 'running') {
    return 'I’m working on that now…';
  }
  if (task?.status === 'scheduled') {
    return task?.due_at ? `Scheduled for ${new Date(task.due_at).toLocaleString('en-GB')}.` : 'Scheduled.';
  }
  return 'I’ve received that request and I’m routing it now.';
}

function statusMeta(status) {
  if (status === 'failed') return { label: 'Failed', className: 'text-rose-300' };
  if (status === 'awaiting_approval' || status === 'waiting_for_approval') return { label: 'Needs approval', className: 'text-amber-300' };
  if (status === 'queued' || status === 'running') return { label: 'Working', className: 'text-cyan-300' };
  if (status === 'scheduled') return { label: 'Scheduled', className: 'text-violet-300' };
  return { label: 'Completed', className: 'text-emerald-300' };
}

function AssistantText({ children }) {
  return (
    <ReactMarkdown
      components={{
        a: ({ href, children: linkChildren }) => <a href={href} target="_blank" rel="noreferrer" className="text-violet-300 underline underline-offset-2">{linkChildren}</a>,
        ul: ({ children: listChildren }) => <ul className="my-2 list-disc space-y-1 pl-5">{listChildren}</ul>,
        ol: ({ children: listChildren }) => <ol className="my-2 list-decimal space-y-1 pl-5">{listChildren}</ol>,
        p: ({ children: paragraphChildren }) => <p className="my-1.5 first:mt-0 last:mb-0">{paragraphChildren}</p>,
        strong: ({ children: strongChildren }) => <strong className="font-semibold text-white">{strongChildren}</strong>,
        code: ({ children: codeChildren }) => <code className="rounded bg-white/10 px-1 py-0.5 text-xs text-violet-200">{codeChildren}</code>,
      }}
    >{children || ' '}</ReactMarkdown>
  );
}

export default function BriefingConsole({ briefing, loading, agents = [], submitting, onSubmit }) {
  const [request, setRequest] = useState('');
  const [agentId, setAgentId] = useState('');
  const [tasks, setTasks] = useState([]);
  const [optimistic, setOptimistic] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const scrollRef = useRef(null);

  const loadTasks = async () => {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) {
      setTasks([]);
      setHistoryLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('personal_tasks')
      .select('id,request,status,result,due_at,created_at,updated_at,category,requires_approval')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(24);
    if (!error) setTasks((data ?? []).reverse());
    setHistoryLoading(false);
  };

  useEffect(() => {
    let alive = true;
    loadTasks();
    const channel = supabase
      .channel('mission-conversation')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'personal_tasks' }, () => {
        if (alive) loadTasks();
      })
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!optimistic) return;
    const matched = tasks.some((task) => task.request === optimistic.request && new Date(task.created_at).getTime() >= optimistic.startedAt - 5000);
    if (matched) setOptimistic(null);
  }, [tasks, optimistic]);

  const messages = useMemo(() => {
    const list = [];
    for (const task of tasks) {
      list.push({ id: `${task.id}-user`, role: 'user', text: task.request, task });
      list.push({ id: `${task.id}-assistant`, role: 'assistant', text: taskReply(task), task });
    }
    if (optimistic) {
      list.push({ id: `${optimistic.id}-user`, role: 'user', text: optimistic.request, optimistic: true });
      list.push({ id: `${optimistic.id}-assistant`, role: 'assistant', text: 'I’m working on that now…', optimistic: true });
    }
    return list;
  }, [tasks, optimistic]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
  }, [messages, submitting]);

  const send = (e) => {
    e?.preventDefault?.();
    const text = request.trim();
    if (!text || submitting) return;
    setOptimistic({ id: `local-${Date.now()}`, request: text, startedAt: Date.now() });
    onSubmit?.({ request: text, agentId: agentId || null });
    setRequest('');
  };

  const showWelcome = !historyLoading && messages.length === 0;

  return (
    <section className="relative mt-4 overflow-hidden rounded-3xl border border-white/10 bg-[#0b0c13]/90 backdrop-blur-xl">
      <NeuralField />
      <div className="relative flex min-h-[560px] flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-lg shadow-cyan-950/40">
              <Bot className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">PalladiumAI</p>
              <p className="flex items-center gap-1.5 text-[10px] text-zinc-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Mission Control conversation</p>
            </div>
          </div>
          <div className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[10px] text-zinc-500 sm:flex">
            <ShieldCheck className="h-3 w-3 text-emerald-400" />Sensitive actions still require approval
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-7" style={{ maxHeight: '620px' }}>
          <div className="mx-auto max-w-3xl space-y-5">
            {(loading || historyLoading) && messages.length === 0 && (
              <div className="flex items-center gap-3 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin text-violet-400" />Loading your conversation…</div>
            )}

            {showWelcome && (
              <div className="flex gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 text-white"><Sparkles className="h-4 w-4" /></span>
                <div className="max-w-[82%] rounded-2xl rounded-tl-sm border border-white/10 bg-white/[.04] px-4 py-3 text-sm leading-7 text-zinc-200">
                  <p>{briefing || 'What can I help you get done today?'}</p>
                  <p className="mt-2 text-xs text-zinc-500">Ask naturally, just like a chat. I can research, plan and prepare actions, and I’ll ask before anything sensitive happens.</p>
                </div>
              </div>
            )}

            {messages.map((message) => {
              const isUser = message.role === 'user';
              const meta = !isUser && message.task ? statusMeta(message.task.status) : null;
              return (
                <div key={message.id} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-white ${isUser ? 'bg-gradient-to-br from-violet-500 to-indigo-600' : 'bg-gradient-to-br from-cyan-400 to-blue-500'}`}>
                    {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                  </span>
                  <div className={`flex max-w-[84%] flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                    <div className={`rounded-2xl px-4 py-3 text-sm leading-7 ${isUser ? 'rounded-tr-sm bg-gradient-to-br from-violet-600 to-indigo-600 text-white' : message.task?.status === 'failed' ? 'rounded-tl-sm border border-rose-400/20 bg-rose-500/[.07] text-rose-50' : 'rounded-tl-sm border border-white/10 bg-white/[.04] text-zinc-200'}`}>
                      {isUser ? <div className="whitespace-pre-wrap">{message.text}</div> : <AssistantText>{message.text}</AssistantText>}
                    </div>
                    {!isUser && (
                      <div className="mt-1.5 flex items-center gap-2 px-1 text-[10px] text-zinc-600">
                        {message.optimistic ? <><Loader2 className="h-3 w-3 animate-spin text-cyan-400" /><span className="text-cyan-300">Working</span></> : meta ? <><Clock3 className="h-3 w-3" /><span className={meta.className}>{meta.label}</span></> : null}
                        {message.task?.category && <span>• {String(message.task.category).replace(/_/g, ' ')}</span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {messages.some((message) => message.task?.status === 'failed') && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-400/15 bg-rose-500/[.04] px-3 py-2 text-[10px] text-rose-200/70">
                <AlertTriangle className="h-3.5 w-3.5" />Failed tasks stay in the conversation so you can see what happened and ask again naturally.
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-white/10 bg-black/20 p-3 sm:p-4">
          <form onSubmit={send} className="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Sparkles className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-400" />
              <input
                value={request}
                onChange={(e) => setRequest(e.target.value)}
                placeholder="Message PalladiumAI…"
                aria-label="Mission Control request"
                className="w-full rounded-2xl border border-white/10 bg-[#11131b] py-3.5 pl-10 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              />
            </div>
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              aria-label="Route to agent"
              className="rounded-2xl border border-white/10 bg-[#11131b] px-3 py-3 text-xs text-zinc-300 focus:border-violet-400/40 focus:outline-none sm:max-w-[190px]"
            >
              <option value="">Auto-route</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <button
              type="submit"
              disabled={submitting || !request.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 transition hover:brightness-110 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="sm:hidden">Send</span>
            </button>
          </form>

          <div className="mx-auto mt-2 flex max-w-3xl gap-1.5 overflow-x-auto pb-1">
            {EXAMPLE_REQUESTS.slice(0, 5).map((ex) => (
              <button key={ex} type="button" onClick={() => setRequest(ex)} className="shrink-0 rounded-full border border-white/10 bg-white/[.03] px-3 py-1 text-[10px] text-zinc-500 transition hover:border-violet-400/30 hover:text-white">{ex}</button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
