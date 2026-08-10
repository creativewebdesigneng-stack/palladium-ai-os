import { useState } from 'react';
import { Sparkles, Send } from 'lucide-react';
import { AI_ACTIONS } from './devData';

const MOCK = {
  'Explain Code': (f) => `This file exports the root ${f?.name || 'component'}. It manages local \`user\` state and conditionally renders the Home view when no session exists, delegating login via a callback.`,
  'Fix Code': (f) => `Found 2 issues in ${f?.name || 'file'}:\n• undefined reference — add an import\n• missing await on async fetch\nApplied patches; re-running checks…`,
  'Generate Code': () => `Generated a new \`useAuth\` hook with token persistence, automatic refresh, and typed session state. Inserted into src/hooks/useAuth.ts.`,
  'Refactor': () => `Extracted the inline fetch into a shared \`api()\` helper and removed duplicate headers. Cyclomatic complexity dropped 18% → 7.`,
  'Test': () => `Added 6 unit tests covering login flow, error states, and empty session. All passing: ✓ 6 passed · 0 failed.`,
  'Debug': () => `Breakpoint hit at line 9 — \`this\` is \`undefined\` in module scope. Root cause: arrow function bound to module. Switched to a named function.`,
};

export default function AIAssistant({ file }) {
  const [msgs, setMsgs] = useState([
    { role: 'ai', text: 'I\'m your AI pair programmer. Select code or an action and I\'ll explain, fix, generate, refactor, test, or debug it.' },
  ]);

  const act = (action) => {
    const reply = MOCK[action](file);
    setMsgs((m) => [...m, { role: 'user', text: `${action}${file ? ' — ' + file.name : ''}` }, { role: 'ai', text: reply }]);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet-400" />
        <h3 className="text-sm font-semibold text-white">AI Assistant</h3>
      </div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {AI_ACTIONS.map((a) => (
          <button key={a} onClick={() => act(a)} className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-zinc-300 hover:bg-violet-500/15 hover:text-white">{a}</button>
        ))}
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {msgs.map((m, i) => (
          <div key={i} className={`rounded-xl px-3 py-2 text-[11px] leading-relaxed ${m.role === 'user' ? 'bg-violet-500/15 text-violet-100' : 'border border-white/10 bg-black/20 text-zinc-200'}`}>
            {m.text}
          </div>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); }} className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
        <input placeholder="Ask about your code…" className="flex-1 bg-transparent text-[11px] text-zinc-200 outline-none placeholder:text-zinc-600" />
        <button className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white"><Send className="h-3.5 w-3.5" /></button>
      </form>
    </div>
  );
}