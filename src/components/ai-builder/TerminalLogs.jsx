import { useEffect, useRef, useState } from 'react';
import { TerminalSquare } from 'lucide-react';
import { TERMINAL } from './aiBuilderData';

export default function TerminalLogs({ lines }) {
  const [all, setAll] = useState(TERMINAL);
  const ref = useRef(null);
  useEffect(() => { if (lines) setAll((a) => [...a, ...lines]); }, [lines]);
  useEffect(() => { ref.current?.scrollTo(0, ref.current.scrollHeight); }, [all]);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/50">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2">
        <TerminalSquare className="h-4 w-4 text-zinc-400" />
        <h3 className="text-xs font-semibold text-white">Terminal / Logs</h3>
        <div className="ml-auto flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
        </div>
      </div>
      <div ref={ref} className="h-40 overflow-y-auto px-4 py-2.5 font-mono text-[11px] leading-relaxed">
        {all.map((l, i) => <p key={i} className={l.c || 'text-zinc-400'}>{l.t}</p>)}
        <p className="text-zinc-600">$ <span className="animate-pulse">▊</span></p>
      </div>
    </div>
  );
}