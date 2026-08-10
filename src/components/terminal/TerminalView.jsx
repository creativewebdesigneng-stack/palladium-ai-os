import { useEffect, useRef, useState } from 'react';
import { Trash2, Copy, TerminalSquare, CornerDownLeft } from 'lucide-react';
import { COMMANDS } from './terminalData';

// Frontend-only command execution. Each entry in COMMANDS is a thin stub;
// a future secure backend runner swaps these out without UI changes.
function runCommand(cmd) {
  const c = cmd.trim();
  if (c === 'clear') return { clear: true };
  if (c === '') return { out: [] };
  if (COMMANDS[c]) return { out: COMMANDS[c] };
  if (c.startsWith('echo ')) return { out: [c.slice(5)] };
  if (c.startsWith('curl ')) return { out: ['HTTP/2 200', 'content-type: application/json', '', '{ "status": "ok" }'] };
  return { out: [`command not found: ${c.split(' ')[0]}`, 'type "help" for available commands'] };
}

export default function TerminalView({ id, onToast }) {
  const [history, setHistory] = useState([
    { p: 'palladium@workspace:~$', c: 'text-violet-400' },
    { t: 'PalladiumAI sandboxed terminal — type "help". No host access.', c: 'text-zinc-500' },
    { t: '', c: 'text-zinc-500' },
  ]);
  const [input, setInput] = useState('');
  const [stack, setStack] = useState([]);
  const [si, setSi] = useState(-1);
  const ref = useRef(null);

  useEffect(() => { ref.current?.scrollTo(0, ref.current.scrollHeight); }, [history]);

  const submit = (e) => {
    e.preventDefault();
    const res = runCommand(input);
    if (res.clear) { setHistory([]); setInput(''); return; }
    setStack((s) => [input, ...s]); setSi(-1);
    setHistory((h) => [...h, { t: `$ ${input}`, c: 'text-zinc-300' }, ...res.out.map((t) => ({ t, c: 'text-zinc-500' }))]);
    setInput('');
  };

  const copy = () => { const txt = history.map((l) => l.t.replace(/^\$ /, '')).join('\n'); navigator.clipboard?.writeText(txt); onToast?.('Terminal output copied'); };
  const clear = () => { setHistory([]); onToast?.('Terminal cleared'); };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/60">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <TerminalSquare className="h-4 w-4 text-violet-400" />
        <span className="text-[11px] font-semibold text-white">Terminal {id}</span>
        <div className="ml-auto flex gap-1">
          <button onClick={copy} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-zinc-400 hover:bg-white/5 hover:text-white"><Copy className="h-3 w-3" />Copy</button>
          <button onClick={clear} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-zinc-400 hover:bg-white/5 hover:text-white"><Trash2 className="h-3 w-3" />Clear</button>
        </div>
      </div>
      <div ref={ref} className="flex-1 overflow-y-auto px-4 py-3 font-mono text-[12px] leading-relaxed">
        {history.map((l, i) => (l.p
          ? <p key={i} className={`${l.c} font-semibold`}>{l.p}</p>
          : <p key={i} className={`whitespace-pre-wrap ${l.c}`}>{l.t || '\u00A0'}</p>
        ))}
        <form onSubmit={submit} className="mt-1 flex items-center gap-2">
          <span className="text-violet-400">$</span>
          <input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') { e.preventDefault(); const n = Math.min(si + 1, stack.length - 1); if (stack[n]) { setSi(n); setInput(stack[n]); } }
              if (e.key === 'ArrowDown') { e.preventDefault(); const n = si - 1; setSi(n); setInput(n >= 0 ? stack[n] : ''); }
            }}
            className="flex-1 bg-transparent text-zinc-200 outline-none placeholder:text-zinc-600"
            placeholder="type a command…"
          />
          <CornerDownLeft className="h-3.5 w-3.5 text-zinc-600" />
        </form>
      </div>
    </div>
  );
}