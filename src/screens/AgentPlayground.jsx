import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Send, ArrowLeft, Cpu, Brain, Clock, Wrench, Activity } from 'lucide-react';
import { agents } from '@/components/palladium/mockData';

export default function AgentPlayground() {
  const { id } = useParams();
  const agent = agents.find(a => a.id === id) || agents[0];
  const [messages, setMessages] = useState([
    { role: 'user', text: 'Summarize our top competitor.' },
    { role: 'agent', text: 'Based on my memory, your top competitor is Linear — they lead in speed and design. Their gap: enterprise analytics, which is your wedge.' },
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages]);

  const send = () => {
    if (!input.trim()) return;
    setMessages(m => [...m, { role: 'user', text: input }, { role: 'agent', text: 'Processing through my tools and memory — here is a reasoned response with next steps.' }]);
    setInput('');
  };

  return (
    <>
      <div className="mb-4"><Link to={`/agents/${agent.id}`} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" />Back to {agent.name}</Link></div>
      <div className="grid h-[calc(100vh-160px)] min-h-[600px] overflow-hidden rounded-2xl border border-white/10 bg-white/[.025] lg:grid-cols-[1fr_340px]">
        <section className="flex min-w-0 flex-col">
          <div className="border-b border-white/10 px-5 py-3"><p className="text-sm font-medium">Playground · {agent.name}</p><p className="text-[10px] text-zinc-500">Direct conversation with this agent</p></div>
          <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto p-5">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
                {m.role === 'user' ? <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-violet-600 px-4 py-3 text-sm">{m.text}</div>
                  : <div className="text-sm leading-7 text-zinc-300"><span className="mr-1 text-[10px] text-violet-400">● {agent.name}</span><p className="mt-1">{m.text}</p></div>}
              </div>
            ))}
          </div>
          <div className="p-4"><div className="flex items-end gap-2 rounded-2xl border border-white/15 bg-[#15161f] p-2">
            <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} rows={1} placeholder={`Message ${agent.name}...`} className="max-h-32 min-h-10 flex-1 resize-none bg-transparent py-2 text-sm outline-none" />
            <button onClick={send} className="rounded-xl bg-violet-600 p-2 text-white"><Send className="h-5 w-5" /></button>
          </div></div>
        </section>
        <aside className="hidden flex-col gap-3 overflow-y-auto border-l border-white/10 p-4 lg:flex">
          <div className="rounded-xl border border-white/10 p-4"><p className="text-xs text-zinc-500">Execution time</p><p className="mt-1 text-2xl font-semibold">2.4s</p></div>
          <div className="rounded-xl border border-white/10 p-4"><p className="text-xs text-zinc-500">Memory usage</p><div className="mt-2 h-2 rounded-full bg-white/5"><div className="h-2 w-2/3 rounded-full bg-violet-500" /></div><p className="mt-1 text-[11px] text-zinc-500">68% of 200K context</p></div>
          <div className="rounded-xl border border-white/10 p-4"><p className="mb-3 text-xs text-zinc-500">Tool usage</p><div className="space-y-2">{[['Web search', 4], ['Documents', 2], ['GitHub', 1]].map(([t, n]) => <div key={t} className="flex items-center gap-2 text-xs"><Wrench className="h-3.5 w-3.5 text-violet-400" />{t}<span className="ml-auto text-zinc-500">{n}×</span></div>)}</div></div>
          <div className="rounded-xl border border-white/10 p-4"><p className="mb-3 text-xs text-zinc-500">Reasoning timeline</p><div className="space-y-2 text-xs text-zinc-400">{['Parsed query','Recalled memory','Searched 3 sources','Drafted answer'].map((s, i) => <div key={s} className="flex items-center gap-2"><Brain className="h-3.5 w-3.5 text-cyan-400" />{s}<span className="ml-auto text-zinc-600">{i + 1}.{i + 2}s</span></div>)}</div></div>
          <div className="rounded-xl border border-white/10 p-4"><p className="mb-3 text-xs text-zinc-500">Performance</p><div className="grid grid-cols-2 gap-2 text-xs">{[['Latency', '2.4s'], ['Tokens', '812'], ['Tools', '7'], ['Confidence', '94%']].map(([k, v]) => <div key={k}><p className="text-zinc-600">{k}</p><p className="text-zinc-200">{v}</p></div>)}</div></div>
        </aside>
      </div>
    </>
  );
}