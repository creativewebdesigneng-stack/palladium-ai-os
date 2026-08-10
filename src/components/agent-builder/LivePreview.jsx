import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Sparkles, Brain, Wrench, CheckCircle2, Bot, User, Activity, MessageSquare, Loader2 } from 'lucide-react';
import { TEST_SEED } from './builderData';

export default function LivePreview({ config }) {
  const [tab, setTab] = useState('preview');
  const [messages, setMessages] = useState(TEST_SEED);
  const [input, setInput] = useState('');
  const [running, setRunning] = useState(false);
  const [activity, setActivity] = useState([
    { t: '11:02', text: 'Agent initialised · Claude Sonnet 4.6', kind: 'init' },
    { t: '11:02', text: 'Loaded 3 knowledge sources', kind: 'load' },
    { t: '11:03', text: 'Permissions: read · write · execute', kind: 'perm' },
  ]);
  const scrollRef = useRef(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, running]);

  const send = () => {
    const text = input.trim();
    if (!text || running) return;
    setInput('');
    setRunning(true);
    setMessages((m) => [...m, { role: 'user', text }]);
    // Simulated agent run — replace with backend function invocation.
    setTimeout(() => {
      const toolName = config.tools.length ? toolLabel(config.tools[0]) : 'Reasoning';
      setMessages((m) => [...m, {
        role: 'agent', text: `Based on ${config.name || 'your agent'}’s context, here’s a response to “${text}”. I analysed the request, used ${toolName}, and drafted an answer aligned with your ${config.role || 'role'}.`,
        steps: [
          { type: 'thinking', text: `Interpret request → plan using ${config.tools.length} tools → draft response.` },
          { type: 'tool', name: toolName, detail: config.tools.length ? `${toolName} · input: "${text.slice(0, 40)}"` : 'internal reasoning' },
          { type: 'result', text: '1 result · confidence 92%' },
        ],
      }]);
      setActivity((a) => [...a, { t: now(), text: `Tool used: ${toolName}`, kind: 'tool' }, { t: now(), text: 'Response generated', kind: 'done' }]);
      setRunning(false);
    }, 1400);
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
            <p className="mt-1.5 px-1 text-[9px] text-zinc-600">{tab === 'test' ? 'Test mode · responses are simulated (backend-ready).' : 'Live preview of agent behaviour.'}</p>
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
        <div className="rounded-2xl rounded-tl-sm border border-white/10 bg-white/[.04] px-3 py-2 text-xs text-zinc-200">{m.text}</div>
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