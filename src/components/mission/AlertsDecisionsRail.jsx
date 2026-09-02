import { AlertTriangle, Bell, ChevronRight, ShieldAlert } from 'lucide-react';

const time = (value) => value ? new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';

export default function AlertsDecisionsRail({ approvals = [], notifications = [], tasks = [], onApprovals, onSignals }) {
  const pending = approvals.filter((item) => item.status === 'pending').slice(0, 3);
  const unread = notifications.filter((item) => !item.read_at).slice(0, 3);
  const failed = tasks.filter((item) => item.status === 'failed').slice(0, 3);
  const items = [
    ...pending.map((item) => ({ id: `a-${item.id}`, kind: 'approval', title: item.title || 'Decision required', detail: item.summary || item.action_type || 'Human approval gate', at: item.created_at })),
    ...failed.map((item) => ({ id: `f-${item.id}`, kind: 'failure', title: item.title || 'Execution exception', detail: item.error || 'A mission did not complete successfully.', at: item.updated_at || item.created_at })),
    ...unread.map((item) => ({ id: `n-${item.id}`, kind: 'signal', title: item.title || 'Intelligence signal', detail: item.body || item.message || 'New notification', at: item.created_at })),
  ].slice(0, 7);
  const meta = {
    approval: { icon: ShieldAlert, cls: 'border-amber-300/15 bg-amber-300/[.035] text-amber-200', label: 'DECISION' },
    failure: { icon: AlertTriangle, cls: 'border-rose-300/15 bg-rose-300/[.035] text-rose-200', label: 'EXCEPTION' },
    signal: { icon: Bell, cls: 'border-cyan-300/12 bg-cyan-300/[.025] text-cyan-200', label: 'SIGNAL' },
  };
  return (
    <section className="rounded-[24px] border border-white/10 bg-black/40 p-4 backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between"><div><p className="text-[9px] font-semibold uppercase tracking-[.25em] text-amber-300/60">Attention rail</p><h2 className="mt-1 text-sm font-semibold text-white">Alerts & decisions</h2></div><span className="rounded-full border border-white/10 bg-white/[.03] px-2 py-1 text-[9px] text-zinc-500">{items.length} active</span></div>
      <div className="space-y-2">
        {items.length ? items.map((item) => { const m = meta[item.kind]; const Icon = m.icon; return <button key={item.id} type="button" onClick={item.kind === 'approval' ? onApprovals : item.kind === 'signal' ? onSignals : undefined} className={`group flex w-full items-start gap-2.5 rounded-xl border p-3 text-left ${m.cls} ${item.kind === 'failure' ? 'cursor-default' : 'hover:border-white/20'}`}><Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="text-[8px] font-semibold tracking-[.18em] opacity-70">{m.label}</span><span className="text-[8px] text-zinc-600">{time(item.at)}</span></div><p className="mt-1 truncate text-[11px] font-medium text-white/90">{item.title}</p><p className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-zinc-500">{item.detail}</p></div>{item.kind !== 'failure' && <ChevronRight className="mt-3 h-3.5 w-3.5 text-zinc-700 transition group-hover:text-white/60" />}</button>; }) : <div className="rounded-xl border border-dashed border-white/10 p-5 text-center"><span className="mx-auto block h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,.6)]" /><p className="mt-2 text-[11px] text-zinc-400">No active alerts or decisions.</p><p className="mt-1 text-[9px] text-zinc-600">Mission Control will surface new events here.</p></div>}
      </div>
    </section>
  );
}
