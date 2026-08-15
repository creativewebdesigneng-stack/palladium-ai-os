import { useState } from 'react';
import { X, Cpu, Users, FolderKanban, Bot, Ban, Pencil, Info } from 'lucide-react';

const TABS = ['Members', 'Teams', 'Projects', 'Agents', 'Billing', 'Usage', 'Security'];
const STATUS_CLS = { active: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20', suspended: 'text-rose-300 bg-rose-400/10 border-rose-400/20', trial: 'text-sky-300 bg-sky-400/10 border-sky-400/20' };
const ROLE_CLS = { Owner: 'text-amber-300', Admin: 'text-violet-300', Member: 'text-zinc-300' };

export default function OrgDetail({ org, onClose, onAction }) {
  const [tab, setTab] = useState('Members');
  if (!org) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-[#0c0d13]">
        <div className="flex items-center gap-2 border-b border-white/10 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-semibold text-white">{org.name[0]}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">{org.name}</p>
            <p className="text-[11px] text-zinc-500">Owner: {org.owner} · {org.members} members</p>
          </div>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] ${STATUS_CLS[org.status] ?? STATUS_CLS.active}`}>{org.status}</span>
          <button onClick={onClose} className="ml-1 text-zinc-500 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-white/10 px-3 py-2">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-medium ${tab === t ? 'bg-violet-500/20 text-white ring-1 ring-violet-400/20' : 'text-zinc-400 hover:text-white'}`}>{t}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'Members' && (
            org.membersList.length ? <div className="space-y-1.5">{org.membersList.map(m => (
              <div key={`${m.e}-${m.n}`} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/5 text-[10px] font-semibold text-white">{m.n[0]}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-[12px] text-white">{m.n}</p><p className="truncate text-[10px] text-zinc-500">{m.e}</p></div>
                <span className={`text-[10px] font-medium ${ROLE_CLS[m.r] ?? 'text-zinc-300'}`}>{m.r}</span>
                {m.t ? <span className="text-[10px] text-zinc-500">{m.t}</span> : null}
              </div>
            ))}</div> : <Empty label="No members" />
          )}
          {tab === 'Teams' && (
            org.teams.length ? <div className="grid grid-cols-2 gap-1.5">{org.teams.map(t => <div key={t} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-2 text-[12px] text-zinc-300"><Users className="h-3.5 w-3.5 text-cyan-400" />{t}</div>)}</div> : <Empty label="No teams" />
          )}
          {tab === 'Projects' && <Unavailable text="Project records are not exposed by the current platform schema, so no project count is inferred here." />}
          {tab === 'Agents' && (
            org.agentsList.length ? <div className="space-y-1.5">{org.agentsList.map(a => <div key={a} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-2 text-[12px] text-zinc-300"><Bot className="h-3.5 w-3.5 text-cyan-400" />{a}</div>)}</div> : <Empty label="No organisation agents" />
          )}
          {tab === 'Billing' && (
            <div className="space-y-2 text-[13px]">
              <Row label="Plan" value={org.billing.plan} />
              <Row label="Monthly price" value={org.billing.mrr} />
              <Row label="Subscription status" value={org.billing.status} />
              <Row label="Seats purchased" value={org.billing.seats} />
              <Row label="Started" value={org.billing.since} />
              {org.billing.currentPeriodEnd ? <Row label="Current period ends" value={org.billing.currentPeriodEnd} /> : null}
              <Row label="Cancel at period end" value={org.billing.cancelAtPeriodEnd ? 'Yes' : 'No'} />
              <Row label="Payment method" value={org.billing.method} />
            </div>
          )}
          {tab === 'Usage' && (
            <div className="grid grid-cols-2 gap-2">
              <Metric icon={Users} label="Members" value={org.usage.seats} />
              <Metric icon={Users} label="Teams" value={org.usage.teams} />
              <Metric icon={Cpu} label="Agents" value={org.usage.agents} />
              <Metric icon={FolderKanban} label="Projects" value="Not available" />
            </div>
          )}
          {tab === 'Security' && <Unavailable text="Organisation-wide MFA, SSO, active-session and risk-posture data are not currently exposed to this admin endpoint. No security status is guessed." />}
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-white/10 p-3">
          <button onClick={() => onAction('edit', org)} className="flex items-center justify-center gap-1 rounded-xl border border-white/10 py-2.5 text-xs text-zinc-300 hover:bg-white/5"><Pencil className="h-3.5 w-3.5" />Edit</button>
          <button onClick={() => onAction('suspend', org)} className="flex items-center justify-center gap-1 rounded-xl border border-amber-400/20 bg-amber-400/10 py-2.5 text-xs text-amber-300 hover:bg-amber-400/20"><Ban className="h-3.5 w-3.5" />Suspend</button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) { return <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2"><span className="text-zinc-500">{label}</span><span className="text-right text-zinc-200">{String(value)}</span></div>; }
function Metric({ icon: Icon, label, value }) { return <div className="rounded-xl border border-white/10 bg-white/[.03] p-3"><div className="flex items-center gap-1.5 text-zinc-500"><Icon className="h-3.5 w-3.5" /><span className="text-[10px] uppercase tracking-wide">{label}</span></div><p className="mt-1 text-lg font-semibold text-white">{value}</p></div>; }
function Empty({ label }) { return <p className="text-center text-[13px] text-zinc-500">{label}.</p>; }
function Unavailable({ text }) { return <div className="flex items-start gap-2 rounded-xl border border-sky-400/15 bg-sky-400/[.04] p-3 text-[12px] text-sky-100/80"><Info className="mt-0.5 h-4 w-4 shrink-0" /><p>{text}</p></div>; }