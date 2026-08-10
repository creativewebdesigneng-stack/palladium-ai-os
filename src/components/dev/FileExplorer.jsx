import { useState } from 'react';
import { ChevronRight, Folder, FolderOpen, FileCode2 } from 'lucide-react';
import { FILES } from './devData';

// Build a tree from file paths.
function buildTree(files) {
  const root = {};
  files.forEach((f) => {
    const parts = f.path.split('/');
    let node = root;
    parts.forEach((p, i) => {
      if (i === parts.length - 1) { (node.__files = node.__files || []).push(f); }
      else { node[p] = node[p] || {}; node = node[p]; }
    });
  });
  return root;
}

export default function FileExplorer({ active, onSelect }) {
  const tree = buildTree(FILES);
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[.03]">
      <div className="border-b border-white/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Explorer</div>
      <div className="flex-1 overflow-y-auto p-2 text-[12px]"><Branch name="palladium-app" node={tree} depth={0} active={active} onSelect={onSelect} /></div>
    </div>
  );
}

function Branch({ name, node, depth, active, onSelect }) {
  const [open, setOpen] = useState(true);
  const dirs = Object.keys(node).filter((k) => k !== '__files' && typeof node[k] === 'object');
  const files = node.__files || [];
  return (
    <div>
      {name !== 'palladium-app' && (
        <button onClick={() => setOpen(o => !o)} className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-zinc-300 hover:bg-white/5" style={{ paddingLeft: depth * 10 }}>
          <ChevronRight className={`h-3 w-3 text-zinc-500 transition ${open ? 'rotate-90' : ''}`} />
          {open ? <FolderOpen className="h-3.5 w-3.5 text-amber-400" /> : <Folder className="h-3.5 w-3.5 text-amber-400" />}
          {name}
        </button>
      )}
      {open && (
        <div>
          {dirs.map((d) => <Branch key={d} name={d} node={node[d]} depth={depth + 1} active={active} onSelect={onSelect} />)}
          {files.map((f) => (
            <button key={f.path} onClick={() => onSelect(f)} className={`flex w-full items-center gap-1.5 rounded px-1 py-0.5 hover:bg-white/5 ${active === f.path ? 'bg-violet-500/15 text-violet-200' : 'text-zinc-400'}`} style={{ paddingLeft: (depth + 1) * 10 + 14 }}>
              <FileCode2 className="h-3.5 w-3.5 text-sky-400 shrink-0" />{f.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}