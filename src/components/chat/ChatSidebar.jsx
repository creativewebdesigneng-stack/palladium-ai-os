import { useMemo, useState } from 'react';
import { MessageSquare, Plus, Search } from 'lucide-react';

export default function ChatSidebar({ conversations, activeId, onSelect, onNew }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((conversation) => conversation.name.toLowerCase().includes(q));
  }, [conversations, query]);

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-white/10 bg-white/[.02]">
      <div className="p-3">
        <button onClick={onNew} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-900/30 transition hover:opacity-90">
          <Plus className="h-4 w-4" />New chat
        </button>
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 text-zinc-600" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this session" className="w-full bg-transparent text-xs text-zinc-200 outline-none placeholder:text-zinc-600" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        <p className="px-2 py-2 text-[10px] font-medium uppercase tracking-widest text-zinc-600">This session</p>
        <div className="space-y-1">
          {filtered.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => onSelect(conversation.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition ${conversation.id === activeId ? 'bg-violet-500/15 text-violet-200' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{conversation.name}</span>
            </button>
          ))}
          {filtered.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-[11px] text-zinc-600">No conversations in this browser session.</p>}
        </div>
      </div>

      <div className="border-t border-white/10 p-3 text-[10px] leading-4 text-zinc-600">
        Chat history is session-local for now. Nothing here is presented as persisted conversation history.
      </div>
    </aside>
  );
}
