import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, X, Plus, Bot, FolderKanban, ListChecks, Workflow } from 'lucide-react';
import { assistantChat } from '@/lib/ai/assistant.functions';

// Deterministic navigation commands. These are UI routing actions, not AI answers —
// anything that is not a navigation command is answered by the real AI provider.
const INTENTS = [
  { test: /project/i, reply: 'Opening your projects…', to: '/projects', icon: FolderKanban },
  { test: /running agent/i, reply: 'Showing running agents…', to: '/agents', icon: Bot },
  { test: /agent/i, reply: 'Heading to your agents…', to: '/agents', icon: Bot },
  { test: /failed workflow/i, reply: 'Filtering workflows with failed runs…', to: '/workflows', icon: Workflow },
  { test: /workflow/i, reply: 'Opening workflows…', to: '/workflows', icon: Workflow },
  { test: /task/i, reply: 'Showing your tasks…', to: '/tasks', icon: ListChecks },
  { test: /create.*project|new project/i, reply: 'Starting a new project…', to: '/projects', icon: Plus },
  { test: /create.*agent|new agent/i, reply: 'Launching the agent builder…', to: '/agent-builder', icon: Plus },
  { test: /file/i, reply: 'Opening files…', to: '/files', icon: FolderKanban },
  { test: /setting/i, reply: 'Opening settings…', to: '/settings', icon: Sparkles },
];

const SUGGESTIONS = [
  'Open my projects',
  'Show running agents',
  'Create a project',
  'Show failed workflows',
];

export default function GlobalAIAssistant({ open, onOpenChange }) {
  const navigate = useNavigate();
  const setOpen = (v) => onOpenChange?.(v);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi, I'm your PalladiumAI assistant. Ask me a question, or tell me where to go — try “Open my projects” or “Show running agents”." },
  ]);
  const [pending, setPending] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, open]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || pending) return;
    const history = messages
      .filter((m) => m.role === 'user' || (m.role === 'assistant' && !m.action && !m.error))
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.text }));
    setMessages((m) => [...m, { role: 'user', text: content }]);
    setInput('');

    const intent = INTENTS.find((i) => i.test.test(content));
    if (intent) {
      setMessages((m) => [...m, { role: 'assistant', text: intent.reply, action: intent.to }]);
      navigate(intent.to);
      setOpen(false);
      return;
    }

    setPending(true);
    try {
      const res = await assistantChat({ data: { message: content, history } });
      setMessages((m) => [...m, { role: 'assistant', text: res.text }]);
    } catch (e) {
      console.error('[assistant]', e);
      setMessages((m) => [...m, { role: 'assistant', error: true, text: e?.message || 'AI service temporarily unavailable.' }]);
    } finally {
      setPending(false);
    }
  };


  return (
    <>
      {/* Floating button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={() => setOpen(true)}
        aria-label="Open AI Assistant"
        className="fixed bottom-6 right-6 z-[70] grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-2xl shadow-violet-500/30 transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50"
      >
        <Sparkles className="h-6 w-6" />
        <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-[#090a0f]" />
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm md:hidden"
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              className="fixed bottom-24 right-6 z-[85] flex h-[60vh] w-[calc(100vw-3rem)] max-w-md flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#101119] shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-white/10 bg-white/[.03] px-5 py-4">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400"><Sparkles className="h-4 w-4 text-white" /></span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">AI Assistant</p>
                  <p className="flex items-center gap-1.5 text-[11px] text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Ready · can navigate your workspace</p>
                </div>
                <button onClick={() => setOpen(false)} aria-label="Close assistant" className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                <AnimatePresence initial={false}>
                  {messages.map((m, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === 'user' ? 'bg-violet-500/20 text-white' : 'bg-white/[.04] text-zinc-200'}`}>
                        {m.text}
                        {m.action && <p className="mt-1.5 flex items-center gap-1 text-[11px] text-violet-300"><Sparkles className="h-3 w-3" /> Navigating…</p>}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {pending && (
                  <div className="flex justify-start">
                    <div className="flex gap-1 rounded-2xl bg-white/[.04] px-4 py-3">
                      {[0, 1, 2].map((d) => <motion.span key={d} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: d * 0.2 }} className="h-1.5 w-1.5 rounded-full bg-zinc-500" />)}
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              {/* Suggestions */}
              <div className="flex flex-wrap gap-1.5 px-5 pb-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-full border border-white/10 bg-white/[.03] px-3 py-1 text-[11px] text-zinc-400 transition hover:border-white/20 hover:text-white">{s}</button>
                ))}
              </div>

              {/* Input */}
              <div className="flex items-center gap-2 border-t border-white/10 px-4 py-3">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="Ask me to do something…"
                  aria-label="Ask the AI assistant"
                  className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-violet-400/40 focus:outline-none"
                />
                <button onClick={() => send()} aria-label="Send" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}