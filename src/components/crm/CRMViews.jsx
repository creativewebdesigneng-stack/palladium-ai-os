import { CONTACTS, COMPANIES, LEADS, ACTIVITIES, TASKS, NOTES, CONTACT_STATUS, TASK_STATUS, AI_SCORE_GRADIENT } from './crmData';
import { Phone, Mail, Calendar, StickyNote, ListChecks, Building2, TrendingUp } from 'lucide-react';

const STATUS_LABEL = { hot: 'Hot', warm: 'Warm', cold: 'Cold', customer: 'Customer' };
const ACT_ICONS = { Phone, Mail, Calendar, StickyNote, ListChecks };
const ACT_TYPE = { call: { icon: 'Phone', tone: 'text-emerald-400 bg-emerald-400/10' }, email: { icon: 'Mail', tone: 'text-sky-400 bg-sky-400/10' }, meeting: { icon: 'Calendar', tone: 'text-violet-400 bg-violet-400/10' }, note: { icon: 'StickyNote', tone: 'text-amber-400 bg-amber-400/10' }, task: { icon: 'ListChecks', tone: 'text-zinc-300 bg-white/10' } };

function ContactRow({ c, onOpen }) {
  return (
    <button onClick={() => onOpen(c)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-left hover:border-violet-400/30 hover:bg-white/5">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-600/40 to-indigo-600/40 text-[11px] font-semibold text-white">{c.name.split(' ').map((n) => n[0]).join('')}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-medium text-white">{c.name}</p>
        <p className="truncate text-[11px] text-zinc-500">{c.email}</p>
      </div>
      <div className="hidden w-24 text-[11px] text-zinc-400 sm:block">{c.company}</div>
      <div className="hidden w-20 items-center gap-1 sm:flex">
        <div className="h-1.5 flex-1 rounded-full bg-white/5"><div className={`h-1.5 rounded-full bg-gradient-to-r ${AI_SCORE_GRADIENT(c.score)}`} style={{ width: `${c.score}%` }} /></div>
      </div>
      <span className={`hidden rounded-full border px-2 py-px text-[10px] font-medium sm:inline ${CONTACT_STATUS[c.status]}`}>{STATUS_LABEL[c.status]}</span>
      <span className="text-[11px] text-zinc-500">{c.owner.split(' ')[0]}</span>
    </button>
  );
}

export function ContactsView({ q, onOpen }) {
  const items = CONTACTS.filter((c) => !q || (c.name + c.company + c.email).toLowerCase().includes(q.toLowerCase()));
  return <div className="space-y-2">{items.map((c) => <ContactRow key={c.id} c={c} onOpen={onOpen} />)}</div>;
}

export function CompaniesView({ q }) {
  const items = COMPANIES.filter((c) => !q || (c.name + c.industry).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items.map((c) => (
        <div key={c.id} className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
          <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-violet-400" /><p className="text-sm font-semibold text-white">{c.name}</p></div>
          <p className="mt-0.5 text-[11px] text-zinc-500">{c.industry} · {c.employees.toLocaleString()} employees</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div><p className="text-[10px] uppercase text-zinc-500">Contacts</p><p className="text-sm font-semibold text-white">{c.contacts}</p></div>
            <div><p className="text-[10px] uppercase text-zinc-500">Deals</p><p className="text-sm font-semibold text-white">{c.deals}</p></div>
            <div><p className="text-[10px] uppercase text-zinc-500">Revenue</p><p className="text-sm font-semibold text-white">{c.revenue}</p></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function LeadsView({ q, onOpen }) {
  const items = LEADS.filter((l) => !q || (l.name + l.company).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map((l) => (
        <button key={l.id} onClick={() => onOpen(CONTACTS.find((c) => c.company === l.company))} className="rounded-2xl border border-white/10 bg-white/[.03] p-3 text-left hover:border-violet-400/30 hover:bg-white/5">
          <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-violet-400" /><p className="text-[13px] font-medium text-white">{l.name}</p></div>
          <p className="text-[11px] text-zinc-500">{l.company}</p>
          <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500"><span>{l.source}</span><span className="rounded-full bg-white/5 px-2 py-px">{l.stage}</span></div>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-white/5"><div className={`h-1.5 rounded-full bg-gradient-to-r ${AI_SCORE_GRADIENT(l.score)}`} style={{ width: `${l.score}%` }} /></div>
            <span className="text-[10px] text-zinc-400">{l.score}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

export function ActivitiesView({ q }) {
  const items = ACTIVITIES.filter((a) => !q || (a.summary + a.contact).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-2">
      {items.map((a) => { const I = ACT_ICONS[ACT_TYPE[a.type].icon]; return (
        <div key={a.id} className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${ACT_TYPE[a.type].tone}`}><I className="h-4 w-4" /></span>
          <div><p className="text-[12px] text-zinc-200">{a.summary}</p><p className="text-[10px] text-zinc-500">{a.when} · {a.contact}</p></div>
        </div>
      ); })}
    </div>
  );
}

export function TasksView({ q }) {
  const items = TASKS.filter((t) => !q || (t.title + t.contact).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-2">
      {items.map((t) => (
        <div key={t.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
          <ListChecks className="h-4 w-4 text-sky-400" />
          <div className="min-w-0 flex-1"><p className="text-[12px] text-zinc-200">{t.title}</p><p className="text-[10px] text-zinc-500">{t.contact} · {t.owner}</p></div>
          <span className="text-[10px] text-zinc-500">{t.due}</span>
          <span className={`rounded-full border px-2 py-px text-[10px] ${TASK_STATUS[t.status]}`}>{t.status}</span>
        </div>
      ))}
    </div>
  );
}

export function NotesView({ q }) {
  const items = NOTES.filter((n) => !q || (n.text + n.contact).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((n) => (
        <div key={n.id} className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
          <div className="flex items-center gap-2"><StickyNote className="h-4 w-4 text-amber-400" /><p className="text-[11px] text-zinc-500">{n.contact}</p></div>
          <p className="mt-2 text-[12px] text-zinc-200">{n.text}</p>
          <p className="mt-2 text-[10px] text-zinc-500">{n.author} · {n.when}</p>
        </div>
      ))}
    </div>
  );
}