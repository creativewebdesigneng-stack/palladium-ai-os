import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Sparkles, Brain, Wrench, CheckCircle2, Bot, User, Activity, MessageSquare, Loader2, AlertTriangle } from 'lucide-react';
import { streamAgentRun } from '@/lib/runtime/run-client';

/**
 * Real agent test console. Runs the saved agent through the production runtime —
 * there is no simulated response path. Until the draft is saved there is nothing
 * to execute, so the console says so rather than inventing an answer.
 */
export default function LivePreview({ config, agentId }) {
  const [tab, setTab] = useState('preview');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [running, setRunning] = useState(false);
  const [activity, setActivity] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, running]);

  const log = (text, kind) => {
    const d = new Date();
    const t = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    setActivity((a) => [...a, { t, text, kind }]);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || running) return;
    if (!agentId) {
      setMessages((m) => [...m, { role: 'user', text }, {
        role: 'agent', error: true,
        text: 'Save this agent first — the test console runs the real agent through the production runtime and cannot execute an unsaved draft.',
      }]);
      setInput('');
      return;
    }

    setInput('');
    setRunning(true);
    setMessages((m) => [...m, { role: 'user', text }, { role: 'agent', text: '', steps: [] }]);
    log('Run started', 'init');

    const appendDelta = (delta) => setMessages((m) => {
      const next = [...m];
      const last = next[next.length - 1];
      if (last?.role === 'agent') next[next.length - 1] = { ...last, text: (last.text || '') + delta };
      return next;
    });
    const addStep = (step) => setMessages((m) => {
      const next = [...m];
      const last = next[next.length - 1];
      if (last?.role === 'agent') next[next.length - 1] = { ...last, steps: [...(last.steps || []), step] };
      return next;
    });
    const setLast = (patch) => setMessages((m) => {
      const next = [...m];
      const last = next[next.length - 1];
      if (last?.role === 'agent') next[next.length - 1] = { ...last, ...patch };
      return next;
    });

    try {
      const task = await streamAgentRun({
        agentId,
        input: text,
        onEvent: (event) => {
          if (event.type === 'delta' && event.delta) appendDelta(event.delta);
          else if (event.type === 'tool') {
            addStep({ type: 'tool', name: event.tool || 'Tool', detail: event.detail || event.status || 'executed' });
            log(`Tool used: ${event.tool || 'tool'}`, 'tool');
          } else if (event.type === 'status' && event.status) {
            log(`Status: ${event.status}`, 'perm');
          } else if (event.type === 'error' && event.error) {
            setLast({ error: true, text: event.error });
          }
        },
      });
      const output = task?.output_text || '';
      if (task?.error) setLast({ error: true, text: task.error });
      else if (output) setLast({ text: output });
      log('Run finished', 'done');
    } catch (e) {
      console.error('[agent-builder:test]', e);
      setLast({ error: true, text: e?.message || 'AI service temporarily unavailable.' });
      log('Run failed', 'error');
    } finally {
      setRunning(false);
    }
  };


  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-1 border-b border-white/10 px-3 py-2">
        {[['preview', 'Preview', MessageSquare], ['test', 'Test mode', Send], ['activity', 'Activity', Activity]].map(([id, label, I]) => (
          <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${tab === id ? 'bg-violet-500/15 text-white ring-1 ring-violet-400/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
            <I className="h-3.5 w-3.5" />{label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] text-zinc-400">
          <Bot className="h-3.5 w-3.5 text-violet-400" />{config.model || 'No model'}
        </div>
      </div>

      {tab === 'activity' ? (
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {activity.map((a, i) => (
            <div key={i} className="flex gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-violet-400 ring-4 ring-violet-400/10" />
              <div><p className="text-xs text-zinc-300">{a.text}</p><p className="text-[10px] text-zinc-600">{a.t}</p></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 && !running && (
              <div className="grid place-items-center py-10 text-center">
                <Bot className="h-6 w-6 text-zinc-600" />
                <p className="mt-2 text-xs text-zinc-400">{agentId ? 'Send a task to run this agent for real.' : 'Save this agent to run a real test.'}</p>
              </div>
            )}
            {messages.map((m, i) => <Message key={i} m={m} />)}
            {running && (
              <div className="flex items-center gap-2 text-xs text-zinc-500"><Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" /> Agent is thinking…</div>
            )}
          </div>
          <div className="border-t border-white/10 p-3">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} disabled={running} placeholder={tab === 'test' ? 'Send a task to your agent…' : 'Message preview…'} className="flex-1 bg-transparent text-xs text-zinc-200 placeholder:text-zinc-600 outline-none disabled:opacity-50" />
              <button onClick={send} disabled={running || !input.trim()} className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40"><Send className="h-3.5 w-3.5" /> Run</button>
            </div>
            <p className="mt-1.5 px-1 text-[9px] text-zinc-600">{agentId ? 'Runs execute on the production runtime — real model, real tools, real usage.' : 'Save this agent to enable real runs. No simulated responses are ever shown.'}</p>
          </div>
        </>
      )}
    </div>
  );
}

function Message({ m }) {
  if (m.role === 'user') {
    return (
      <div className="flex justify-end gap-2">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-violet-500/15 px-3 py-2 text-xs text-zinc-100 ring-1 ring-violet-400/20">{m.text}</div>
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10"><User className="h-3.5 w-3.5 text-zinc-300" /></span>
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600"><Sparkles className="h-3.5 w-3.5 text-white" /></span>
      <div className="max-w-[85%] space-y-2">
        {m.steps && (
          <div className="space-y-1.5">
            {m.steps.map((s, i) => <Step key={i} s={s} />)}
          </div>
        )}
        <div className={`flex items-start gap-2 rounded-2xl rounded-tl-sm border px-3 py-2 text-xs ${m.error ? 'border-rose-400/25 bg-rose-500/10 text-rose-200' : 'border-white/10 bg-white/[.04] text-zinc-200'}`}>
          {m.error && <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
          <span>{m.text || (m.error ? 'AI service temporarily unavailable.' : '…')}</span>
        </div>
      </div>
    </div>
  );
}

function Step({ s }) {
  const map = {
    thinking: { icon: Brain, label: 'Thinking', cls: 'text-violet-300 bg-violet-500/10' },
    tool: { icon: Wrench, label: s.name, cls: 'text-amber-300 bg-amber-500/10' },
    result: { icon: CheckCircle2, label: 'Result', cls: 'text-emerald-300 bg-emerald-500/10' },
  };
  const cfg = map[s.type] || map.thinking;
  const I = cfg.icon;
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className={`flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-[11px] ${cfg.cls}`}>
      <I className="h-3.5 w-3.5 shrink-0" />
      <div><p className="text-[9px] font-semibold uppercase tracking-wider opacity-70">{cfg.label}</p><p className="text-zinc-200">{s.detail || s.text}</p></div>
    </motion.div>
  );
}

function toolLabel(id) { return ({ web_search: 'Web Search', browser: 'Browser', code: 'Code Execution', terminal: 'Terminal', files: 'Files', database: 'Database', http: 'HTTP Requests', email: 'Email', calendar: 'Calendar', github: 'GitHub', slack: 'Slack', discord: 'Discord' })[id] || 'Reasoning'; }
function now() { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }