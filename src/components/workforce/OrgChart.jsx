import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

function Node({ node, depth = 0 }) {
  const [open, setOpen] = useState(true);
  const hasKids = node.children && node.children.length;
  return (
    <div className={depth === 0 ? '' : 'ml-3 border-l border-white/10 pl-3'}>
      <button onClick={() => hasKids && setOpen(o => !o)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white/5">
        {hasKids ? (open ? <ChevronDown className="h-3.5 w-3.5 text-zinc-500" /> : <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />) : <span className="h-2 w-2 rounded-full bg-zinc-600" />}
        <span className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${node.grad} text-xs font-semibold text-white shadow`}>{node.letter}</span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-white">{node.name}</p>
          <p className="truncate text-[10px] text-zinc-500">{node.role}</p>
        </div>
      </button>
      {open && hasKids && <div className="mt-1 space-y-1">{node.children.map((c, i) => <Node key={i} node={c} depth={depth + 1} />)}</div>}
    </div>
  );
}

export default function OrgChart({ org }) {
  return <div className="space-y-1"><Node node={org} /></div>;
}