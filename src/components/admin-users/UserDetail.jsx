import { useState } from 'react';
import { X, Cpu, Bot, FolderKanban, HardDrive, ShieldCheck, ShieldAlert, CreditCard, Activity, UserCog } from 'lucide-react';

const TABS = ['Account', 'Usage', 'Projects', 'Agents', 'Billing', 'Security', 'Activity'];

const STATUS_CLS = {
  active: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20',
  suspended: 'text-rose-300 bg-rose-400/10 border-rose-400/20',
  invited: 'text-sky-300 bg-sky-400/10 border-sky-400/20',
};
const RISK_CLS = { low: 'text-emerald-300', medium: 'text-amber-300', high: 'text-rose-300' };

export default function UserDetail({ user, onClose, onAction }) {
  const [tab, setTab] = useState('Account');
  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-[#0c0d13]">
        <div className="flex items-center gap-2 border-b border-white/10 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-sm font-semibold text-white">{user.name[0]}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">{user.name}</p>
            <p className="text-[11px] text-zinc-500">{user.email}</p>
          </div>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] ${STATUS_CLS[user.status]}`}>{user.status}</span>
          <button onClick={onClose} className="ml-1 text-zinc-500 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-white/10 px-3 py-2">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-medium ${tab === t ? 'bg-violet-500/20 text-white ring-1 ring-violet-400/20' : 'text-zinc-400 hover:text-white'}`}>{t}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'Account' && (
            <div className="space-y-2 text-[13px]">
              <Row label="Name" value={user.name} />
              <Row label="Email" value={user.email} />
              <Row label="Plan" value={user.plan} />
              <Row label="Status" value={user.status} />
              <Row label="Organisation" value={user.org} />
              <Row label="Created" value={user.created} />
              <Row label="Last active" value={user.lastActive} />
            </div>
          )}
          {tab === 'Usage' && (
            <div className="grid grid-cols-2 gap-2">
              <Metric icon={Cpu} label="AI Requests" value={user.usage.requests.toLocaleString()} />
              <Metric icon={Bot} label="Agents" value={user.usage.agents} />
              <Metric icon={FolderKanban} label="Projects" value={user.usage.projects} />
              <Metric icon={HardDrive} label="Storage (GB)" value={user.usage.storage} />
            </div>
          )}
          {tab === 'Projects' && (
            user.projects.length ? <div className="space-y-1.5">{user.projects.map(p => <div key={p} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-2 text-[12px] text-zinc-300"><FolderKanban className="h-3.5 w-3.5 text-violet-400" />{p}</div>)}</div> : <Empty label="No projects" />
          )}
          {tab === 'Agents' && (
            user.agents.length ? <div className="space-y-1.5">{user.agents.map(a => <div key={a} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-2 text-[12px] text-zinc-300"><Bot className="h-3.5 w-3.5 text-cyan-400" />{a}</div>)}</div> : <Empty label="No agents" />
          )}
          {tab === 'Billing' && (
            <div className="space-y-2 text-[13px]">
              <Row label="Plan" value={user.billing.plan} />
              <Row label="MRR" value={user.billing.mrr} />
              <Row label="Method" value={user.billing.method} />
              <Row label="Since" value={user.billing.since} />
            </div>
          )}
          {tab === 'Security' && (
            <div className="space-y-2 text-[13px]">
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                {user.security.mfa ? <ShieldCheck className="h-4 w-4 text-emerald-300" /> : <ShieldAlert className="h-4 w-4 text-amber-300" />}
                <span className="text-zinc-200">MFA {user.security.mfa ? 'enabled' : 'disabled'}</span>
              </div>
              <Row label="Active sessions" value={user.security.sessions} />
              <Row label="Last login" value={user.security.lastLogin} />
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <span className="text-zinc-200">Risk level</span>
                <span className={`text-[12px] font-medium capitalize ${RISK_CLS[user.security.risk]}`}>{user.security.risk}</span>
              </div>
            </div>
          )}
          {tab === 'Activity' && (
            user.activity.length ? <div className="space-y-2">{user.activity.map((e, i) => <div key={i} className="flex gap-2"><span className="mt-1.5 h-2 w-2 rounded-full bg-violet-400 ring-4 ring-violet-400/10" /><div><p className="text-[12px] text-zinc-300">{e.a}</p><p className="text-[10px] text-zinc-600">{e.t}</p></div></div>)}</div> : <Empty label="No activity" />
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-white/10 p-3">
          <button onClick={() => onAction('edit', user)} className="flex items-center justify-center gap-1 rounded-xl border border-white/10 py-2.5 text-xs text-zinc-300 hover:bg-white/5"><Pencil className="h-3.5 w-3.5" />Edit</button>
          {user.status === 'suspended' ? (
            <button onClick={() => onAction('unsuspend', user)} className="flex items-center justify-center gap-1 rounded-xl border border-emerald-400/20 bg-emerald-400/10 py-2.5 text-xs text-emerald-300 hover:bg-emerald-400/20">Unsuspend</button>
          ) : (
            <button onClick={() => onAction('suspend', user)} className="flex items-center justify-center gap-1 rounded-xl border border-amber-400/20 bg-amber-400/10 py-2.5 text-xs text-amber-300 hover:bg-amber-400/20">Suspend</button>
          )}
          <button onClick={() => onAction('impersonate', user)} className="flex items-center justify-center gap-1 rounded-xl border border-sky-400/20 bg-sky-400/10 py-2.5 text-xs text-sky-300 hover:bg-sky-400/20"><UserCog className="h-3.5 w-3.5" />Impersonate</button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2"><span className="text-zinc-500">{label}</span><span className="text-zinc-200">{value}</span></div>;
}
function Metric({ icon: Icon, label, value }) {
  return <div className="rounded-xl border border-white/10 bg-white/[.03] p-3"><div className="flex items-center gap-1.5 text-zinc-500"><Icon className="h-3.5 w-3.5" /><span className="text-[10px] uppercase tracking-wide">{label}</span></div><p className="mt-1 text-lg font-semibold text-white">{value}</p></div>;
}
function Empty({ label }) { return <p className="text-center text-[13px] text-zinc-500">{label}.</p>; }
function Pencil() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>; }