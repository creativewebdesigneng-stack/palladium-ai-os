import { useEffect, useRef, useState } from 'react';
import { TerminalSquare } from 'lucide-react';
import { TERMINAL_HELP } from './devData';

export default function Terminal() {
  const [history, setHistory] = useState([{ t: 'palladium terminal — type "help"', c: 'text-zinc-500' }]);
  const [input, setInput] = useState('');
  const ref = useRef(null);
  useEffect(() => { ref.current?.scrollTo(0, ref.current.scrollHeight); }, [history]);

  const run = (cmd) => {
    const c = cmd.trim();
    if (c === 'clear') { setHistory([]); return; }
    const out = TERMINAL_HELP[c] || (c.startsWith('cat ') ? [`→ showing ${c.slice(4)}`, '(mock file content)'] : [`command not found: ${c}`, 'type "help" for available commands']);
    setHistory((h) => [
      ...h,
      { t: `$ ${c}`, c: 'text-zinc-300' },
      ...out.map((t) => ({ t, c: 'text-zinc-500' })),
    ]);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/60">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2">
        <TerminalSquare className="h-4 w-4 text-zinc-400" />
        <h3 className="text-xs font-semibold text-white">Terminal</h3>
        <div className="ml-auto flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
        </div>
      </div>
      <div ref={ref} className="h-44 overflow-y-auto px-4 py-2 font-mono text-[11px] leading-relaxed">
        {history.map((l, i) => <p key={i} className={l.c}>{l.t}</p>)}
        <form onSubmit={(e) => { e.preventDefault(); run(input); setInput(''); }} className="mt-1 flex items-center gap-2">
          <span className="text-violet-400">$</span>
          <input autoFocus value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 bg-transparent text-zinc-200 outline-none" placeholder="type a command…" />
        </form>
      </div>
    </div>
  );
}