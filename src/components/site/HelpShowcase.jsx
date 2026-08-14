import { assistantChat } from '@/lib/ai/assistant.functions';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Search, Rocket, Bot, FolderKanban, CreditCard, Plug, Code2, ShieldCheck,
  Workflow, ChevronDown, Clock, Eye, ThumbsUp, ArrowUpRight, ArrowRight,
  Send, Sparkles, Mail, MessageSquare, Phone, LifeBuoy,
} from 'lucide-react';
import { TOPICS, ARTICLES, FAQ, AI_SUGGESTIONS } from '@/components/site/helpData';

const TOPIC_ICONS = { Rocket, Bot, FolderKanban, CreditCard, Plug, Code2, ShieldCheck, Workflow };

const TOPIC_LABEL = Object.fromEntries(TOPICS.map((t) => [t.key, t.label]));
const TOPIC_TONE = Object.fromEntries(TOPICS.map((t) => [t.key, t.tone]));

export function HelpSearch({ query, setQuery, active, setActive, results }) {
  return (
    <>
      <div className="relative mx-auto max-w-2xl">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for help, articles and guides…"
          className="w-full rounded-xl border border-white/10 bg-white/[.03] py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-zinc-500 focus:border-violet-400/40 focus:outline-none"
        />
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button
          onClick={() => setActive('all')}
          className={`rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition ${active === 'all' ? 'border-violet-400/40 bg-violet-500/15 text-white' : 'border-white/10 bg-white/[.03] text-zinc-400 hover:border-white/20 hover:text-white'}`}
        >All</button>
        {TOPICS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition ${active === t.key ? 'border-violet-400/40 bg-violet-500/15 text-white' : 'border-white/10 bg-white/[.03] text-zinc-400 hover:border-white/20 hover:text-white'}`}
          >{t.label}</button>
        ))}
      </div>
      {results > 0 && (
        <p className="mt-5 text-center text-xs text-zinc-500">{results} article{results === 1 ? '' : 's'}{active !== 'all' && ` in ${TOPIC_LABEL[active]}`}{query && ` matching "${query}"`}</p>
      )}
    </>
  );
}

export function TopicGrid() {
  return (
    <div className="mx-auto grid max-w-7xl gap-3 px-6 sm:grid-cols-2 lg:grid-cols-4">
      {TOPICS.map((t, i) => {
        const Icon = TOPIC_ICONS[t.icon];
        return (
          <motion.div
            key={t.key}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, delay: (i % 4) * 0.06 }}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.025] p-5 transition hover:border-white/20 hover:bg-white/[.04]"
          >
            <div className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${t.tone} opacity-15 blur-2xl transition group-hover:opacity-30`} />
            <div className="relative flex items-center justify-between">
              <span className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${t.tone} shadow-lg`}>
                <Icon className="h-5 w-5 text-white" />
              </span>
              <span className="text-[11px] text-zinc-500">{t.count} articles</span>
            </div>
            <h3 className="relative mt-4 text-base font-semibold text-white">{t.label}</h3>
            <span className="relative mt-3 flex items-center gap-1 text-xs text-zinc-500 transition group-hover:text-white">
              Browse <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

export function ArticleGrid({ query, active }) {
  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () => ARTICLES.filter((a) => {
      const matchCat = active === 'all' || a.topic === active;
      const matchQ = !q || a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q);
      return matchCat && matchQ;
    }),
    [q, active]
  );

  if (filtered.length === 0) return <div className="mx-auto max-w-7xl px-6 text-center text-sm text-zinc-500">No articles found. Try a different search or topic.</div>;

  return (
    <div className="mx-auto max-w-7xl px-6">
      <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((a) => (
            <motion.article
              key={a.title}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="group flex flex-col rounded-2xl border border-white/10 bg-white/[.025] p-5 transition hover:border-white/20 hover:bg-white/[.04]"
            >
              <div className="flex items-center gap-2 text-[11px]">
                <span className={`rounded-full bg-gradient-to-r ${TOPIC_TONE[a.topic]} px-2.5 py-1 font-medium text-white`}>{TOPIC_LABEL[a.topic]}</span>
              </div>
              <h3 className="mt-3 text-base font-semibold leading-snug text-white group-hover:text-violet-200">{a.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{a.excerpt}</p>
              <div className="mt-auto flex items-center justify-between pt-4 text-[11px] text-zinc-500">
                <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {a.read}</span>
                <span className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {a.views}</span>
                  <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {a.helpful}%</span>
                </span>
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export function FaqList() {
  const [open, setOpen] = useState(null);
  return (
    <div className="mx-auto max-w-3xl px-6">
      <div className="space-y-2">
        {FAQ.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={i} className="overflow-hidden rounded-xl border border-white/10 bg-white/[.025]">
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="text-sm font-medium text-white">{item.q}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-400 transition ${isOpen ? 'rotate-180 text-violet-300' : ''}`} />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <p className="px-5 pb-4 text-sm leading-relaxed text-zinc-400">{item.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ContactSupport() {
  const channels = [
    { icon: Mail, label: 'Email Support', desc: 'Average reply in under 4 hours', action: 'support@palladium.ai', tone: 'text-violet-300' },
    { icon: MessageSquare, label: 'Live Chat', desc: 'Mon–Fri, 9am–6pm GMT', action: 'Start a chat', tone: 'text-cyan-300' },
    { icon: Phone, label: 'Priority Line', desc: 'Business & Enterprise plans', action: '+44 20 0000 0000', tone: 'text-emerald-300' },
  ];
  return (
    <div className="mx-auto grid max-w-5xl gap-4 px-6 md:grid-cols-3">
      {channels.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.label} className="rounded-2xl border border-white/10 bg-white/[.025] p-6 text-center transition hover:border-white/20 hover:bg-white/[.04]">
            <span className={`mx-auto grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[.04] ${c.tone}`}>
              <Icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-sm font-semibold text-white">{c.label}</h3>
            <p className="mt-1 text-xs text-zinc-500">{c.desc}</p>
            <p className={`mt-3 text-sm ${c.tone}`}>{c.action}</p>
          </div>
        );
      })}
    </div>
  );
}

export function AIAssistant() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi, I'm your AI support assistant. Ask me anything about PalladiumAI — answers come from live AI, not a script." },
  ]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || pending) return;
    const history = messages
      .filter((m) => !m.error)
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.text }));
    setMessages((m) => [...m, { role: 'user', text: content }]);
    setInput('');
    setPending(true);
    try {
      const res = await assistantChat({ data: { message: content, history } });
      setMessages((m) => [...m, { role: 'assistant', text: res.text }]);
    } catch (e) {
      console.error('[help-assistant]', e);
      const raw = e?.message || '';
      const text = /unauthor|sign in|401/i.test(raw)
        ? 'Sign in to ask the AI support assistant.'
        : raw || 'AI service temporarily unavailable.';
      setMessages((m) => [...m, { role: 'assistant', error: true, text }]);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-6">
      <div className="space-y-2">
        {FAQ.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={i} className="overflow-hidden rounded-xl border border-white/10 bg-white/[.025]">
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="text-sm font-medium text-white">{item.q}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-400 transition ${isOpen ? 'rotate-180 text-violet-300' : ''}`} />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <p className="px-5 pb-4 text-sm leading-relaxed text-zinc-400">{item.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ContactSupport() {
  const channels = [
    { icon: Mail, label: 'Email Support', desc: 'Average reply in under 4 hours', action: 'support@palladium.ai', tone: 'text-violet-300' },
    { icon: MessageSquare, label: 'Live Chat', desc: 'Mon–Fri, 9am–6pm GMT', action: 'Start a chat', tone: 'text-cyan-300' },
    { icon: Phone, label: 'Priority Line', desc: 'Business & Enterprise plans', action: '+44 20 0000 0000', tone: 'text-emerald-300' },
  ];
  return (
    <div className="mx-auto grid max-w-5xl gap-4 px-6 md:grid-cols-3">
      {channels.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.label} className="rounded-2xl border border-white/10 bg-white/[.025] p-6 text-center transition hover:border-white/20 hover:bg-white/[.04]">
            <span className={`mx-auto grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[.04] ${c.tone}`}>
              <Icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-sm font-semibold text-white">{c.label}</h3>
            <p className="mt-1 text-xs text-zinc-500">{c.desc}</p>
            <p className={`mt-3 text-sm ${c.tone}`}>{c.action}</p>
          </div>
        );
      })}
    </div>
  );
}

export function AIAssistant() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi, I'm your AI support assistant. Ask me anything about PalladiumAI — answers come from live AI, not a script." },
  ]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || pending) return;
    const history = messages
      .filter((m) => !m.error)
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.text }));
    setMessages((m) => [...m, { role: 'user', text: content }]);
    setInput('');
    setPending(true);
    try {
      const res = await assistantChat({ data: { message: content, history } });
      setMessages((m) => [...m, { role: 'assistant', text: res.text }]);
    } catch (e) {
      console.error('[help-assistant]', e);
      const raw = e?.message || '';
      const text = /unauthor|sign in|401/i.test(raw)
        ? 'Sign in to ask the AI support assistant.'
        : raw || 'AI service temporarily unavailable.';
      setMessages((m) => [...m, { role: 'assistant', error: true, text }]);
    } finally {
      setPending(false);
    }
  };


  return (
    <div className="mx-auto max-w-3xl px-6">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[.05] to-white/[.02]">
        <div className="flex items-center gap-3 border-b border-white/10 bg-white/[.03] px-5 py-4">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400">
            <Sparkles className="h-4 w-4 text-white" />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">AI Support Assistant</p>
            <p className="flex items-center gap-1.5 text-[11px] text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live AI · signed-in operators</p>
          </div>
        </div>
        <div className="h-72 space-y-3 overflow-y-auto px-5 py-4">
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === 'user' ? 'bg-violet-500/20 text-white' : m.error ? 'bg-rose-500/10 text-rose-200 ring-1 ring-rose-400/20' : 'bg-white/[.04] text-zinc-200'}`}>
                  {m.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {pending && <p className="px-1 text-[11px] text-zinc-500">Thinking…</p>}
        </div>
        <div className="border-t border-white/10 px-5 pb-3 pt-3">
          <div className="mb-3 flex flex-wrap gap-2">
            {AI_SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full border border-white/10 bg-white/[.03] px-3 py-1 text-[11px] text-zinc-400 transition hover:border-white/20 hover:text-white"
              >{s}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              disabled={pending}
              placeholder="Describe your issue…"
              className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-violet-400/40 focus:outline-none"
            />
            <button
              onClick={() => send()}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 text-white transition hover:opacity-90"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HelpCta() {
  return (
    <div className="mx-auto max-w-5xl px-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/25 via-[#0c0d14] to-cyan-500/15 p-12 text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,.3),transparent_60%)]" />
        <LifeBuoy className="relative mx-auto h-8 w-8 text-violet-300" />
        <h2 className="relative mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Still need help?</h2>
        <p className="relative mx-auto mt-4 max-w-xl text-zinc-400">Our support team and AI assistant are here 24/7 to get you unstuck.</p>
        <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/register?returnTo=/dashboard" className="group flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200">
            Get Started <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
          <a href="#contact" className="rounded-xl border border-white/15 bg-white/[.03] px-6 py-3 text-sm font-medium text-white backdrop-blur transition hover:bg-white/10">Contact Support</a>
        </div>
      </div>
    </div>
  );
}