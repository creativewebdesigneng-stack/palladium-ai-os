import { useState } from 'react';
import { Search, FileCode2 } from 'lucide-react';
import { FILE_CONTENT, TREE } from './codeExplorerData';

function flatten(node, prefix = '', out = []) {
  for (const n of node) {
    const path = prefix ? `${prefix}/${n.name}` : n.name;
    if (n.type === 'file') out.push(path);
    else if (n.children) flatten(n.children, path, out);
  }
  return out;
}
const ALL_FILES = flatten(TREE);

export default function FileSearch({ onSelect }) {
  const [q, setQ] = useState('');
  const results = q ? ALL_FILES.filter((p) => p.toLowerCase().includes(q.toLowerCase())) : ALL_FILES;
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search files by name…" className="w-full rounded-lg border border-white/10 bg-black/30 py-1.5 pl-8 pr-3 text-[11px] text-zinc-200 outline-none" />
      </div>
      <div className="space-y-0.5">
        {results.slice(0, 40).map((p) => (
          <button key={p} onClick={() => onSelect(p)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] text-zinc-300 hover:bg-white/5">
            <FileCode2 className="h-3.5 w-3.5 text-sky-400" />{p}
          </button>
        ))}
        {!results.length && <p className="px-2 text-[11px] text-zinc-600">No files match "{q}"</p>}
      </div>
    </div>
  );
}

export function CodeSearch({ onSelect }) {
  const [q, setQ] = useState('');
  const matches = q ? Object.entries(FILE_CONTENT).flatMap(([path, code]) => {
    return code.split('\n').map((line, i) => {
      if (line.toLowerCase().includes(q.toLowerCase())) return { path, line: i + 1, text: line.trim() };
      return null;
    }).filter(Boolean);
  }) : [];
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search code across files…" className="w-full rounded-lg border border-white/10 bg-black/30 py-1.5 pl-8 pr-3 text-[11px] text-zinc-200 outline-none" />
      </div>
      <div className="space-y-1">
        {matches.slice(0, 30).map((m, i) => (
          <button key={i} onClick={() => onSelect(m.path)} className="block w-full rounded-lg px-2 py-1.5 text-left hover:bg-white/5">
            <p className="font-mono text-[10px] text-zinc-500">{m.path}:{m.line}</p>
            <p className="truncate font-mono text-[11px] text-zinc-300">{m.text}</p>
          </button>
        ))}
        {q && !matches.length && <p className="px-2 text-[11px] text-zinc-600">No matches for "{q}"</p>}
      </div>
    </div>
  );
}