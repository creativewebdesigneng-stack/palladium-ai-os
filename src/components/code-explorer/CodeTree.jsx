import { useState } from 'react';
import { ChevronRight, Folder, FolderOpen, FileCode2, MoreVertical, FilePlus2, Pencil, Trash2, Copy, FolderInput, Download } from 'lucide-react';
import { TREE, GIT_STATUS, GIT_STYLE } from './codeExplorerData';

const ACTION_ICONS = { Create: FilePlus2, Rename: Pencil, Delete: Trash2, Duplicate: Copy, Move: FolderInput, Download: Download };

export default function CodeTree({ active, onSelect, onAction }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[.03]">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Project</span>
        <button onClick={() => onAction('Create', active)} className="ml-auto grid h-7 w-7 place-items-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"><FilePlus2 className="h-3.5 w-3.5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 text-[12px]">
        <Node node={{ name: 'palladium-app', type: 'dir', open: true, children: TREE }} depth={0} active={active} onSelect={onSelect} onAction={onAction} isRoot />
      </div>
    </div>
  );
}

function Node({ node, depth, active, onSelect, onAction, isRoot }) {
  const [open, setOpen] = useState(!!node.open);
  const [menu, setMenu] = useState(false);
  if (node.type === 'file') {
    const path = node.__path;
    const st = GIT_STATUS[path];
    return (
      <div className="group relative flex items-center">
        <button onClick={() => onSelect(path)} className={`flex flex-1 items-center gap-1.5 rounded px-1.5 py-0.5 hover:bg-white/5 ${active === path ? 'bg-violet-500/15 text-violet-200' : 'text-zinc-400'}`} style={{ paddingLeft: depth * 10 + 8 }}>
          <FileCode2 className="h-3.5 w-3.5 shrink-0 text-sky-400" />
          <span className="truncate">{node.name}</span>
        </button>
        {st && <span className={`mr-1 font-mono text-[10px] font-bold ${GIT_STYLE[st]}`}>{st}</span>}
        <button onClick={() => setMenu(m => !m)} className="opacity-0 transition group-hover:opacity-100"><MoreVertical className="h-3.5 w-3.5 text-zinc-500" /></button>
        {menu && <Menu path={path} onAction={(a) => { onAction(a, path); setMenu(false); }} />}
      </div>
    );
  }
  return (
    <div>
      <div className="group relative flex items-center">
        <button onClick={() => !isRoot && setOpen(o => !o)} className="flex flex-1 items-center gap-1 rounded px-1.5 py-0.5 text-zinc-300 hover:bg-white/5" style={{ paddingLeft: depth * 10 + 4 }}>
          {!isRoot && <ChevronRight className={`h-3 w-3 text-zinc-500 transition ${open ? 'rotate-90' : ''}`} />}
          {open ? <FolderOpen className="h-3.5 w-3.5 text-amber-400" /> : <Folder className="h-3.5 w-3.5 text-amber-400" />}
          {node.name}
        </button>
        <button onClick={() => setMenu(m => !m)} className="opacity-0 transition group-hover:opacity-100"><MoreVertical className="h-3.5 w-3.5 text-zinc-500" /></button>
        {menu && <Menu path={node.name} onAction={(a) => { onAction(a, node.name); setMenu(false); }} />}
      </div>
      {open && node.children?.map((c, i) => {
        const childPath = isRoot ? c.name : `${node.__path || node.name}/${c.name}`;
        return <Node key={i} node={{ ...c, __path: childPath }} depth={depth + 1} active={active} onSelect={onSelect} onAction={onAction} />;
      })}
    </div>
  );
}

function Menu({ path, onAction }) {
  return (
    <div className="absolute right-2 top-7 z-20 w-36 rounded-xl border border-white/10 bg-[#10121a] py-1 shadow-2xl">
      {['Create', 'Rename', 'Delete', 'Duplicate', 'Move', 'Download'].map((a) => { const I = ACTION_ICONS[a]; return (
        <button key={a} onClick={() => onAction(a)} className="flex w-full items-center gap-2 px-3 py-1.5 text-[11px] text-zinc-300 hover:bg-white/5"><I className="h-3.5 w-3.5 text-zinc-500" />{a}</button>
      ); })}
    </div>
  );
}