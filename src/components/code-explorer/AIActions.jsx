import { useState } from 'react';
import { Sparkles, Wand2 } from 'lucide-react';
import { AI_ACTIONS, AI_RESPONSES } from './codeExplorerData';

export default function AIActions({ file }) {
  const [out, setOut] = useState(null);
  const run = (a) => setOut({ action: a, text: AI_RESPONSES[a](file || 'selection') });
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-400" /><h3 className="text-sm font-semibold text-white">AI actions</h3></div>
      <div className="grid grid-cols-2 gap-1.5">
        {AI_ACTIONS.map((a) => (
          <button key={a} onClick={() => run(a)} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2 py-1.5 text-[10px] text-zinc-200 hover:bg-violet-500/15 hover:text-white"><Wand2 className="h-3 w-3 text-zinc-500" />{a}</button>
        ))}
      </div>
      {out && (
        <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-3 py-2.5">
          <p className="mb-1 text-[10px] font-semibold text-violet-300">{out.action}</p>
          <p className="text-[11px] leading-relaxed text-zinc-200">{out.text}</p>
        </div>
      )}
    </div>
  );
}