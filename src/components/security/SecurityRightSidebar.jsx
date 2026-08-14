import { History, BarChart3, Sparkles, Bell, CheckCircle2 } from 'lucide-react';
import { kindStyle } from './securityData';
import { timeAgo } from './format';

function Panel({ icon: Icon, title, grad, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-3.5">
      <div className="mb-2.5 flex items-center gap-2">
        <span className={`grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-br ${grad}`}>
          <Icon className="h-3 w-3 text-white" />
        </span>
        <h3 className="text-xs font-semibold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

const QUICK = [
  { label: 'MFA', tab: 'Authentication', grad: 'from-violet-500 to-indigo-500' },
  { label: 'Keys', tab: 'API Security', grad: 'from-amber-500 to-orange-500' },
  { label: 'Sessions', tab: 'Sessions', grad: 'from-sky-500 to-blue-500' },
  { label: 'Audit', tab: 'Audit Log', grad: 'from-cyan-500 to-sky-500' },
];

export default function SecurityRightSidebar({ alerts = [], score, auditLogs = [], onNavigate }) {
  const band = (score?.total ?? 0) >= 85 ? 'Good' : (score?.total ?? 0) >= 70 ? 'Fair' : 'Needs work';
  return (
    <div className="space-y-3">
      <Panel icon={Bell} title="Latest Alerts" grad="from-rose-500 to-red-500">
        {alerts.length === 0 ? (
          <p className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            Nothing to review
          </p>
        ) : (
          <div className="space-y-1.5">
            {alerts.slice(0, 3).map((a) => {
              const style = kindStyle(a.kind);
              return (
                <div key={a.id} className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/[.02] p-2">
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md bg-gradient-to-br ${style.grad}`}>
                    <style.icon className="h-3 w-3 text-white" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium text-white">{a.title}</p>
                    <p className="truncate text-[9px] text-zinc-600">{timeAgo(a.at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel icon={BarChart3} title="Security Score" grad="from-emerald-500 to-teal-500">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-lg font-semibold text-white">{score?.total ?? '—'}</span>
          <span className="text-[10px] text-zinc-500">{band}</span>
        </div>
        <div className="space-y-1.5">
          {(score?.breakdown ?? []).slice(0, 4).map((b) => (
            <div key={b.key}>
              <div className="flex justify-between text-[9px] text-zinc-500">
                <span>{b.label}</span>
                <span className="tabular-nums">{b.value}</span>
              </div>
              <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${b.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel icon={History} title="Recent Activity" grad="from-sky-500 to-blue-500">
        {auditLogs.length === 0 ? (
          <p className="text-[11px] text-zinc-500">No recorded activity yet</p>
        ) : (
          <div className="space-y-1.5">
            {auditLogs.slice(0, 4).map((a) => (
              <div key={a.id} className="rounded-lg border border-white/5 bg-white/[.02] p-2">
                <p className="truncate text-[11px] text-zinc-300">{a.action}</p>
                <p className="text-[9px] text-zinc-600">{timeAgo(a.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel icon={Sparkles} title="Jump To" grad="from-violet-500 to-fuchsia-500">
        <div className="grid grid-cols-2 gap-2">
          {QUICK.map((a) => (
            <button
              key={a.label}
              onClick={() => onNavigate?.(a.tab)}
              className="rounded-xl border border-white/10 bg-white/[.03] p-2.5 text-left text-[11px] font-medium text-white hover:bg-white/5"
            >
              <span className={`mb-1.5 block h-1.5 w-6 rounded-full bg-gradient-to-r ${a.grad}`} />
              {a.label}
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}
