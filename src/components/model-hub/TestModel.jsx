import { useState } from 'react';
import { X, Send, Sparkles } from 'lucide-react';

export default function TestModel({ model, onClose }) {
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState([]);
  if (!model) return null;

  const send = () => {
    if (!input.trim()) return;
    setMsgs(m => [...m, { from: 'user', text: input }, { from: 'ai', text: `[${model.name}] Mock response to: "${input}". (Illustrative preview — connect the provider to run live inference.)` }]);
    setInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#0c0d13]">
        <div className="flex items-center gap-2 border-b border-white/10 p-4">
          <span className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${model.grad} text-sm font-semibold text-white`}>{model.provider[0]}</span>
          <div>
            <p className="text-sm font-semibold text-white">Test {model.name}</p>
            <p className="text-[11px] text-zinc-500">{model.provider} · {model.context}</p>
          </div>
          <button onClick={onClose} className="ml-auto text-zinc-500 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {msgs.length === 0 && <p className="mt-10 text-center text-xs text-zinc-600">Send a message to test this model.</p>}
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-xl px-3 py-2 text-[13px] ${m.from === 'user' ? 'bg-violet-500/20 text-white' : 'border border-white/10 bg-white/[.03] text-zinc-200'}`}>
                {m.from === 'ai' && <Sparkles className="mb-1 h-3 w-3 text-violet-400" />}
                {m.text}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 p-3">
          <div className="flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Type a test prompt…" className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" />
            <button onClick={send} className="grid place-items-center rounded-lg bg-violet-500 px-3 text-white hover:bg-violet-600"><Send className="h-4 w-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}