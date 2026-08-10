import { useState } from 'react';
import { ChevronRight, FileCode2, Folder, FolderOpen } from 'lucide-react';
import { FILE_TREE, COMPONENTS, PROPERTIES } from './aiBuilderData';

export default function FilesPanel() {
  const [tab, setTab] = useState('files');
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[.03]">
      <div className="flex border-b border-white/10">
        {['files', 'components', 'properties'].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3.5 py-2.5 text-xs font-medium capitalize ${tab === t ? 'border-b-2 border-violet-400 text-white' : 'text-zinc-400 hover:text-white'}`}>{t}</button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-2.5">
        {tab === 'files' && <Tree items={FILE_TREE} depth={0} />}
        {tab === 'components' && (
          <div className="grid grid-cols-2 gap-2">
            {COMPONENTS.map((c) => (
              <div key={c} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-2 text-[11px] text-zinc-200 hover:bg-white/5"><FileCode2 className="h-3.5 w-3.5 text-sky-400" />{c}</div>
            ))}
          </div>
        )}
        {tab === 'properties' && (
          <div className="space-y-2">
            {PROPERTIES.map((p) => (
              <div key={p.key} className="rounded-lg border border-white/10 bg-black/20 p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-white">{p.key}</span>
                  <span className="rounded bg-white/5 px-1.5 py-px text-[9px] text-zinc-500">{p.type}</span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-violet-300">{String(p.value)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Tree({ items, depth }) {
  return (
    <div className="space-y-0.5">
      {items.map((it, i) => <Node key={it.name + i} node={it} depth={depth} />)}
    </div>
  );
}

function Node({ node, depth }) {
  const [open, setOpen] = useState(!!node.open);
  if (node.file) {
    return (
      <div className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] text-zinc-300 hover:bg-white/5" style={{ paddingLeft: depth * 12 + 8 }}>
        <FileCode2 className="h-3.5 w-3.5 text-zinc-500" />{node.name}
      </div>
    );
  }
  return (
    <div>
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] text-zinc-200 hover:bg-white/5" style={{ paddingLeft: depth * 12 + 4 }}>
        <ChevronRight className={`h-3 w-3 text-zinc-500 transition ${open ? 'rotate-90' : ''}`} />
        {open ? <FolderOpen className="h-3.5 w-3.5 text-amber-400" /> : <Folder className="h-3.5 w-3.5 text-amber-400" />}
        {node.name}
      </button>
      {open && node.children && <Tree items={node.children} depth={depth + 1} />}
    </div>
  );
}