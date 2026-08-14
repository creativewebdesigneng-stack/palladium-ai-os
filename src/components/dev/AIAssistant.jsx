import { useState } from 'react';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { AI_ACTIONS } from './devData';
import { assistantChat } from '@/lib/ai/assistant.functions';

/**
 * AI pair programmer. Every reply comes from the real model provider through the
 * server gateway — there are no canned or simulated answers. Provider failures
 * are surfaced verbatim to the operator.
 */
export default function AIAssistant({ file }) {
  const [msgs, setMsgs] = useState([
    { role: 'ai', text: "I'm your AI pair programmer. Pick an action or ask a question about the selected file." },
  ]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);

  const ask = async (prompt, label) => {
    if (!prompt.trim() || pending) return;
    const history = msgs
      .filter((m) => !m.error)
      .slice(-6)
      .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));
    setMsgs((m) => [...m, { role: 'user', text: label || prompt }]);
    setPending(true);
    try {
      const res = await assistantChat({ data: { message: prompt, history } });
      setMsgs((m) => [...m, { role: 'ai', text: res.text }]);
    } catch (e) {
      console.error('[dev-assistant]', e);
      setMsgs((m) => [...m, { role: 'ai', error: true, text: e?.message || 'AI service temporarily unavailable.' }]);
    } finally {
      setPending(false);
    }
  };

  const act = (action) => {
    const context = file
      ? `File: ${file.name}\n\n${(file.content ?? '').slice(0, 6000)}`
      : 'No file is selected.';
    ask(`${action} for the following file.\n\n${context}`, `${action}${file ? ' — ' + file.name : ''}`);
  };

  const submit = (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput('');
    ask(file ? `${text}\n\nFile: ${file.name}\n\n${(file.content ?? '').slice(0, 6000)}` : text, text);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet-400" />
        <h3 className="text-sm font-semibold text-white">AI Assistant</h3>
      </div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {AI_ACTIONS.map((a) => (
          <button key={a} disabled={pending} onClick={() => act(a)} className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-zinc-300 hover:bg-violet-500/15 hover:text-white disabled:opacity-40">{a}</button>
        ))}
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {msgs.map((m, i) => (
          <div key={i} className={`whitespace-pre-wrap rounded-xl px-3 py-2 text-[11px] leading-relaxed ${m.role === 'user' ? 'bg-violet-500/15 text-violet-100' : m.error ? 'border border-rose-400/25 bg-rose-500/10 text-rose-200' : 'border border-white/10 bg-black/20 text-zinc-200'}`}>
            {m.text}
          </div>
        ))}
        {pending && (
          <div className="flex items-center gap-2 px-1 text-[11px] text-zinc-500"><Loader2 className="h-3 w-3 animate-spin text-violet-400" /> Thinking…</div>
        )}
      </div>
      <form onSubmit={submit} className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} disabled={pending} placeholder="Ask about your code…" className="flex-1 bg-transparent text-[11px] text-zinc-200 outline-none placeholder:text-zinc-600 disabled:opacity-50" />
        <button type="submit" disabled={pending || !input.trim()} className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white disabled:opacity-40"><Send className="h-3.5 w-3.5" /></button>
      </form>
    </div>
  );
}
