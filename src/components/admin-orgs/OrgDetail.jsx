import { useState } from 'react';
import { X, Cpu, HardDrive, Users, FolderKanban, Bot, ShieldCheck, ShieldAlert, Ban, Pencil } from 'lucide-react';

const TABS = ['Members', 'Teams', 'Projects', 'Agents', 'Billing', 'Usage', 'Security'];
const STATUS_CLS = { active: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20', suspended: 'text-rose-300 bg-rose-400/10 border-rose-400/20', trial: 'text-sky-300 bg-sky-400/10 border-sky-400/20' };
const ROLE_CLS = { Owner: 'text-amber-300', Admin: 'text-violet-300', Member: 'text-zinc-300' };
const RISK_CLS = { low: 'text-emerald-300', medium: 'text-amber-300', high: 'text-rose-300' };

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
          <span className={`rounded-full border px-2 py-0.5 text-[10px] ${STATUS_CLS[org.status]}`}>{org.status}</span>
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
              <div key={m.e} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/5 text-[10px] font-semibold text-white">{m.n[0]}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-[12px] text-white">{m.n}</p><p className="truncate text-[10px] text-zinc-500">{m.e}</p></div>
                <span className={`text-[10px] font-medium ${ROLE_CLS[m.r]}`}>{m.r}</span>
                <span className="text-[10px] text-zinc-500">{m.t}</span>
              </div>
            ))}</div> : <Empty label="No members" />
          )}
          {tab === 'Teams' && (
            org.teams.length ? <div className="grid grid-cols-2 gap-1.5">{org.teams.map(t => <div key={t} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-2 text-[12px] text-zinc-300"><Users className="h-3.5 w-3.5 text-cyan-400" />{t}</div>)}</div> : <Empty label="No teams" />
          )}
          {tab === 'Projects' && (
            org.projects.length ? <div className="space-y-1.5">{org.projects.map(p => <div key={p} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-2 text-[12px] text-zinc-300"><FolderKanban className="h-3.5 w-3.5 text-violet-400" />{p}</div>)}</div> : <Empty label="No projects" />
          )}
          {tab === 'Agents' && (
            org.agents.length ? <div className="space-y-1.5">{org.agents.map(a => <div key={a} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-2 text-[12px] text-zinc-300"><Bot className="h-3.5 w-3.5 text-cyan-400" />{a}</div>)}</div> : <Empty label="No agents" />
          )}
          {tab === 'Billing' && (
            <div className="space-y-2 text-[13px]">
              <Row label="Plan" value={org.billing.plan} />
              <Row label="MRR" value={org.billing.mrr} />
              <Row label="Method" value={org.billing.method} />
              <Row label="Seats" value={org.billing.seats} />
              <Row label="Since" value={org.billing.since} />
            </div>
          )}
          {tab === 'Usage' && (
            <div className="grid grid-cols-2 gap-2">
              <Metric icon={Cpu} label="AI Requests" value={org.usage.requests.toLocaleString()} />
              <Metric icon={HardDrive} label="Storage (GB)" value={org.usage.storage} />
              <Metric icon={Users} label="Seats used" value={org.usage.seats} />
              <Metric icon={FolderKanban} label="Projects" value={org.projects} />
            </div>
          )}
          {tab === 'Security' && (
            <div className="space-y-2 text-[13px]">
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2">{org.security.mfaEnforced ? <ShieldCheck className="h-4 w-4 text-emerald-300" /> : <ShieldAlert className="h-4 w-4 text-amber-300" />}<span className="text-zinc-200">MFA {org.security.mfaEnforced ? 'enforced' : 'not enforced'}</span></div>
              <Row label="SSO" value={org.security.sso ? 'Enabled' : 'Disabled'} />
              <Row label="Active sessions" value={org.security.sessions} />
              <Row label="Last incident" value={org.security.lastIncident} />
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2"><span className="text-zinc-200">Risk level</span><span className={`text-[12px] font-medium capitalize ${RISK_CLS[org.security.risk]}`}>{org.security.risk}</span></div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-white/10 p-3">
          <button onClick={() => onAction('edit', org)} className="flex items-center justify-center gap-1 rounded-xl border border-white/10 py-2.5 text-xs text-zinc-300 hover:bg-white/5"><Pencil className="h-3.5 w-3.5" />Edit</button>
          <button onClick={() => onAction('suspend', org)} className="flex items-center justify-center gap-1 rounded-xl border border-amber-400/20 bg-amber-400/10 py-2.5 text-xs text-amber-300 hover:bg-amber-400/20"><Ban className="h-3.5 w-3.5" />Suspend</button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) { return <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2"><span className="text-zinc-500">{label}</span><span className="text-zinc-200">{value}</span></div>; }
function Metric({ icon: Icon, label, value }) { return <div className="rounded-xl border border-white/10 bg-white/[.03] p-3"><div className="flex items-center gap-1.5 text-zinc-500"><Icon className="h-3.5 w-3.5" /><span className="text-[10px] uppercase tracking-wide">{label}</span></div><p className="mt-1 text-lg font-semibold text-white">{value}</p></div>; }
function Empty({ label }) { return <p className="text-center text-[13px] text-zinc-500">{label}.</p>; }