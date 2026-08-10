import { useState } from 'react';
import { Plus, Search, Pin, Folder, FolderOpen, ChevronDown, MessageSquare, FileText, Bookmark, Bot, Star, Hash } from 'lucide-react';
import { CONVERSATIONS, FOLDERS, PROJECTS, RECENT_FILES, SAVED_PROMPTS, AGENTS, FAVORITES } from './chatData';

function Section({ icon: Icon, title, count, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="px-2 py-1">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-[10px] uppercase tracking-widest text-zinc-500 hover:bg-white/5">
        <ChevronDown className={`h-3 w-3 transition ${open ? '' : '-rotate-90'}`} />{Icon && <Icon className="h-3 w-3" />}{title}
        {count != null && <span className="ml-auto text-zinc-600">{count}</span>}
      </button>
      {open && <div className="mt-0.5 space-y-0.5">{children}</div>}
    </div>
  );
}

function Row({ icon: Icon, label, sub, active, onClick, trailing }) {
  return (
    <button onClick={onClick} className={`group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs ${active ? 'bg-violet-500/15 text-violet-200' : 'text-zinc-400 hover:bg-white/5'}`}>
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {sub && <span className="text-[10px] text-zinc-600">{sub}</span>}
      {trailing}
    </button>
  );
}

export default function ChatSidebar({ activeId, onSelect, onNew, onOpenPrompts }) {
  const [q, setQ] = useState('');
  const [openFolders, setOpenFolders] = useState(() => Object.fromEntries(FOLDERS.map(f => [f, true])));
  const filtered = CONVERSATIONS.filter(c => c.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-white/10 bg-white/[.02]">
      <div className="p-3">
        <button onClick={onNew} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-900/30 transition hover:opacity-90">
          <Plus className="h-4 w-4" />New chat
        </button>
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 text-zinc-600" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search conversations" className="w-full bg-transparent text-xs text-zinc-200 outline-none placeholder:text-zinc-600" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-3">
        {/* Pinned */}
        <Section icon={Pin} title="Pinned" count={filtered.filter(c => c.pinned).length}>
          {filtered.filter(c => c.pinned).map(c => (
            <Row key={c.id} icon={MessageSquare} label={c.name} sub={c.time} active={c.id === activeId} onClick={() => onSelect(c.id)} />
          ))}
        </Section>

        {/* Folders with conversations */}
        <Section icon={Folder} title="Folders" count={FOLDERS.length}>
          {FOLDERS.map(folder => {
            const items = filtered.filter(c => c.folder === folder);
            if (!items.length) return null;
            const open = openFolders[folder];
            return (
              <div key={folder}>
                <button onClick={() => setOpenFolders(s => ({ ...s, [folder]: !s[folder] }))} className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-zinc-400 hover:bg-white/5">
                  <ChevronDown className={`h-3 w-3 transition ${open ? '' : '-rotate-90'}`} />
                  {open ? <FolderOpen className="h-3.5 w-3.5 text-violet-300" /> : <Folder className="h-3.5 w-3.5 opacity-70" />}
                  <span className="truncate">{folder}</span>
                  <span className="ml-auto text-[10px] text-zinc-600">{items.length}</span>
                </button>
                {open && <div className="ml-3 space-y-0.5 border-l border-white/10 pl-2">{items.map(c => (
                  <Row key={c.id} icon={MessageSquare} label={c.name} sub={c.time} active={c.id === activeId} onClick={() => onSelect(c.id)} />
                ))}</div>}
              </div>
            );
          })}
        </Section>

        <Section icon={Hash} title="Projects" count={PROJECTS.length}>
          {PROJECTS.map(p => (
            <Row key={p.id} label={p.name} sub={`${p.chats} chats`} icon={() => <span className={`h-3.5 w-3.5 rounded bg-gradient-to-br ${p.color}`} />} />
          ))}
        </Section>

        <Section icon={FileText} title="Recent files" count={RECENT_FILES.length} defaultOpen={false}>
          {RECENT_FILES.map(f => <Row key={f.id} icon={FileText} label={f.name} sub={f.size} />)}
        </Section>

        <Section icon={Bookmark} title="Saved prompts" count={SAVED_PROMPTS.length} defaultOpen={false}>
          {SAVED_PROMPTS.map(s => <Row key={s.id} label={s.name} sub={s.cat} onClick={onOpenPrompts} />)}
        </Section>

        <Section icon={Bot} title="AI Agents" count={AGENTS.length}>
          {AGENTS.map(a => (
            <Row key={a.id} label={a.name} icon={() => <span className={`grid h-4 w-4 place-items-center rounded bg-gradient-to-br ${a.grad} text-[8px] text-white`}>{a.name[0]}</span>}
              trailing={<span className={`h-1.5 w-1.5 rounded-full ${a.status === 'active' ? 'bg-emerald-400' : 'bg-zinc-600'}`} />} />
          ))}
        </Section>

        <Section icon={Star} title="Favourites" count={FAVORITES.length} defaultOpen={false}>
          {FAVORITES.map(f => <Row key={f.id} icon={Star} label={f.name} />)}
        </Section>
      </div>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-2 rounded-xl bg-white/5 p-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 text-xs font-semibold text-white">PA</span>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-zinc-200">Palladium Admin</p>
            <p className="text-[10px] text-zinc-500">Pro · 12,400 credits</p>
          </div>
        </div>
      </div>
    </aside>
  );
}