import { useState } from 'react';
import { ChevronRight, FileCode2 } from 'lucide-react';
import { FILE_TREE } from './builderData';

export default function FileExplorer({ active, onSelect }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-3 backdrop-blur-xl">
      <p className="px-1 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Explorer</p>
      <div className="mt-1 space-y-0.5">
        {FILE_TREE.map(node => <TreeNode key={node.name} node={node} depth={0} active={active} onSelect={onSelect} />)}
      </div>
    </div>
  );
}

function TreeNode({ node, depth, active, onSelect }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = !!node.children?.length;
  return (
    <div>
      <button
        onClick={() => hasChildren ? setOpen(o => !o) : onSelect && onSelect(node.name)}
        className={`flex w-full items-center gap-1.5 rounded-lg py-1.5 pr-2 text-left text-xs transition ${active === node.name ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}`}
        style={{ paddingLeft: depth * 12 + 4 }}
      >
        {hasChildren ? <ChevronRight className={`h-3 w-3 shrink-0 transition ${open ? 'rotate-90' : ''}`} /> : <span className="w-3" />}
        {hasChildren ? <node.icon className="h-3.5 w-3.5 shrink-0 text-amber-400" /> : <FileCode2 className="h-3.5 w-3.5 shrink-0 text-sky-400" />}
        <span className="truncate">{node.name}</span>
        {node.lines > 0 && <span className="ml-auto text-[10px] text-zinc-600">{node.lines}</span>}
      </button>
      {hasChildren && open && (
        <div className="mt-0.5 space-y-0.5">
          {node.children.map(c => <TreeNode key={c.name} node={c} depth={depth + 1} active={active} onSelect={onSelect} />)}
        </div>
      )}
    </div>
  );
}