import { useMemo, useState } from 'react';
import { Search, Copy, Download, Maximize2, Minimize2, Check } from 'lucide-react';
import { CODE_FILES } from './builderData';

const KEYWORDS = ['import', 'from', 'export', 'default', 'function', 'return', 'const', 'let', 'async', 'await', 'if', 'else', 'class', 'new', 'CREATE', 'TABLE', 'PRIMARY', 'KEY', 'VARCHAR', 'TIMESTAMP', 'REFERENCES'];

function highlight(line) {
  // string literals
  let parts = [line];
  KEYWORDS.forEach(kw => {
    parts = parts.flatMap(p => {
      if (typeof p !== 'string') return [p];
      const re = new RegExp(`\\b${kw}\\b`, 'g');
      const split = p.split(re);
      const matches = p.match(re) || [];
      const out = [];
      split.forEach((s, i) => {
        if (s) out.push(s);
        if (matches[i]) out.push(<span key={kw + i} className="text-violet-400 font-medium">{matches[i]}</span>);
      });
      return out;
    });
  });
  // strings
  parts = parts.flatMap(p => {
    if (typeof p !== 'string') return [p];
    const re = /(['"`])(.*?)\1/g;
    let last = 0, m, out = [];
    while ((m = re.exec(p)) !== null) {
      if (m.index > last) out.push(p.slice(last, m.index));
      out.push(<span key={m.index} className="text-emerald-400">{m[0]}</span>);
      last = m.index + m[0].length;
    }
    if (last < p.length) out.push(p.slice(last));
    return out.length ? out : [p];
  });
  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts;
}

export default function CodeViewer({ file = 'App.jsx', fullscreen, onToggleFs }) {
  const [active, setActive] = useState(file);
  const [q, setQ] = useState('');
  const [copied, setCopied] = useState(false);
  const code = CODE_FILES[active] || CODE_FILES['App.jsx'];

  const lines = useMemo(() => code.split('\n'), [code]);
  const filtered = q ? lines.filter(l => l.toLowerCase().includes(q.toLowerCase())) : lines;

  const copy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`flex flex-col rounded-2xl border border-white/10 bg-[#0a0b10] backdrop-blur-xl ${fullscreen ? 'fixed inset-4 z-[90]' : ''}`}>
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-white/10 px-2 py-2">
        <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {Object.keys(CODE_FILES).map(f => (
            <button key={f} onClick={() => setActive(f)} className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] ${active === f ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>{f}</button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1.5 pr-1">
          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/30 px-2 py-1">
            <Search className="h-3 w-3 text-zinc-600" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search" className="w-20 bg-transparent text-[11px] text-zinc-200 outline-none placeholder:text-zinc-600" />
          </div>
          <button onClick={copy} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white">{copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}</button>
          <button className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"><Download className="h-3.5 w-3.5" /></button>
          <button onClick={onToggleFs} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white">{fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}</button>
        </div>
      </div>
      {/* Code */}
      <div className="flex-1 overflow-auto p-3 font-mono text-[12px] leading-6">
        {filtered.map((l, i) => (
          <div key={i} className="flex hover:bg-white/[.02]">
            <span className="w-8 shrink-0 select-none pr-3 text-right text-zinc-700">{i + 1}</span>
            <span className="text-zinc-300">{highlight(l)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}