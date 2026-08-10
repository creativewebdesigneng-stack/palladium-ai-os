import { useState } from 'react';
import { Search, BookOpen } from 'lucide-react';
import { TICKETS, STATUS_STYLE, PRIORITY_STYLE, STATUS_FILTERS, CUSTOMERS, TIER_STYLE, SUPPORT_AGENTS, LIVE_CHATS, CHAT_MESSAGES, KB, AUTOMATIONS } from './supportData';

export function TicketsView() {
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const rows = TICKETS.filter(t => (filter === 'all' || t.status === filter) && (t.subject.toLowerCase().includes(q.toLowerCase()) || t.customer.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative"><Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-600" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search tickets" className="w-56 rounded-xl border border-white/10 bg-black/20 py-2 pl-8 pr-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" /></div>
        <div className="flex gap-1 overflow-x-auto">
          {STATUS_FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-medium capitalize ${filter === f ? 'bg-violet-500/20 text-white' : 'text-zinc-400 hover:text-white'}`}>{f}</button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead><tr className="text-left text-zinc-500">
            <th className="px-2 py-1.5 font-medium">ID</th><th className="px-2 py-1.5 font-medium">CUSTOMER</th><th className="px-2 py-1.5 font-medium">SUBJECT</th>
            <th className="px-2 py-1.5 font-medium">PRIORITY</th><th className="px-2 py-1.5 font-medium">AGENT</th><th className="px-2 py-1.5 font-medium">STATUS</th>
            <th className="px-2 py-1.5 font-medium">CREATED</th><th className="px-2 py-1.5 font-medium">UPDATED</th>
          </tr></thead>
          <tbody>
            {rows.map(t => (
              <tr key={t.id} className="border-t border-white/5 hover:bg-white/[.02]">
                <td className="px-2 py-2 font-mono text-zinc-400">{t.id}</td>
                <td className="px-2 py-2 text-zinc-200">{t.customer}</td>
                <td className="px-2 py-2 text-zinc-200">{t.subject}</td>
                <td className="px-2 py-2"><span className={`rounded-full border px-2 py-px text-[10px] font-medium capitalize ${PRIORITY_STYLE[t.priority]}`}>{t.priority}</span></td>
                <td className="px-2 py-2 text-zinc-400">{t.agent}</td>
                <td className="px-2 py-2"><span className={`rounded-full border px-2 py-px text-[10px] font-medium capitalize ${STATUS_STYLE[t.status]}`}>{t.status}</span></td>
                <td className="px-2 py-2 text-zinc-500">{t.created}</td>
                <td className="px-2 py-2 text-zinc-500">{t.updated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CustomersView() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {CUSTOMERS.map(c => (
        <div key={c.id} className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
          <div className="flex items-center gap-2"><p className="text-[13px] font-medium text-white">{c.name}</p><span className={`ml-auto rounded-full px-2 py-px text-[10px] font-medium ${TIER_STYLE[c.tier]}`}>{c.tier}</span></div>
          <p className="mt-1 text-[11px] text-zinc-500">{c.plan} plan</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-white/10 py-2"><p className="text-sm font-semibold text-white">{c.tickets}</p><p className="text-[10px] text-zinc-500">Total</p></div>
            <div className="rounded-lg border border-white/10 py-2"><p className="text-sm font-semibold text-amber-300">{c.open}</p><p className="text-[10px] text-zinc-500">Open</p></div>
            <div className="rounded-lg border border-white/10 py-2"><p className="text-sm font-semibold text-emerald-300">{c.tickets - c.open}</p><p className="text-[10px] text-zinc-500">Closed</p></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AgentsView() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {SUPPORT_AGENTS.map(a => (
        <div key={a.id} className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-violet-600/50 to-indigo-600/50 text-xs font-semibold text-white">{a.name.split(' ').map(n => n[0]).join('')}</div>
            <div className="min-w-0"><p className="truncate text-[13px] font-medium text-white">{a.name}</p><p className="text-[10px] text-zinc-500">{a.role}</p></div>
            <span className={`ml-auto h-2 w-2 rounded-full ${a.online ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-white/10 py-2"><p className="text-sm font-semibold text-sky-300">{a.active}</p><p className="text-[10px] text-zinc-500">Active</p></div>
            <div className="rounded-lg border border-white/10 py-2"><p className="text-sm font-semibold text-emerald-300">{a.resolved}</p><p className="text-[10px] text-zinc-500">Resolved</p></div>
            <div className="rounded-lg border border-white/10 py-2"><p className="text-sm font-semibold text-violet-300">{a.csat}%</p><p className="text-[10px] text-zinc-500">CSAT</p></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function LiveChatView() {
  const [active, setActive] = useState(LIVE_CHATS[0].id);
  const thread = CHAT_MESSAGES;
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-3 lg:col-span-1">
        <p className="mb-2 px-1 text-[11px] font-medium text-zinc-500">Conversations</p>
        <div className="space-y-1">
          {LIVE_CHATS.map(c => (
            <button key={c.id} onClick={() => setActive(c.id)} className={`flex w-full items-center gap-2 rounded-xl p-2.5 text-left ${active === c.id ? 'bg-violet-500/15' : 'hover:bg-white/5'}`}>
              <span className={`h-2 w-2 rounded-full ${c.status === 'active' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <div className="min-w-0 flex-1"><p className="truncate text-[12px] text-zinc-200">{c.customer}</p><p className="truncate text-[10px] text-zinc-500">{c.last}</p></div>
              {c.unread > 0 && <span className="rounded-full bg-rose-500 px-1.5 text-[10px] font-medium text-white">{c.unread}</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4 lg:col-span-2">
        <div className="space-y-2">
          {thread.map(m => (
            <div key={m.id} className={`flex ${m.from === 'agent' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-[12px] ${m.from === 'agent' ? 'bg-violet-600/30 text-white' : 'bg-white/5 text-zinc-200'}`}>{m.text}<p className={`mt-1 text-[9px] ${m.from === 'agent' ? 'text-violet-200/70' : 'text-zinc-500'}`}>{m.time}</p></div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2"><input placeholder="Type a reply…" className="flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" /><button className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-xs font-medium text-white">Send</button></div>
      </div>
    </div>
  );
}

export function KnowledgeView() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {KB.map(k => (
        <div key={k.id} className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
          <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-violet-400" /><p className="text-[13px] font-medium text-white">{k.title}</p></div>
          <p className="mt-1 text-[11px] text-zinc-500">{k.category} · {k.views} views · updated {k.updated}</p>
        </div>
      ))}
    </div>
  );
}

export function AutomationView() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="space-y-2">
        {AUTOMATIONS.map(a => (
          <div key={a.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="min-w-0 flex-1"><p className="text-[13px] font-medium text-white">{a.name}</p><p className="text-[10px] text-zinc-500">{a.trigger} → {a.action}</p></div>
            <span className={`h-2 w-2 rounded-full ${a.on ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
            <span className="text-[10px] text-zinc-400">{a.on ? 'Active' : 'Paused'}</span>
            <button className={`rounded-lg px-2.5 py-1 text-[10px] font-medium ${a.on ? 'bg-white/5 text-zinc-300 hover:bg-white/10' : 'bg-violet-500/20 text-white'}`}>{a.on ? 'Pause' : 'Enable'}</button>
          </div>
        ))}
      </div>
    </div>
  );
}