import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Activity, GitBranch, IdCard, ShieldAlert, ShieldCheck, Users, Workflow } from 'lucide-react';
import { getWorkforceOperatingState } from '@/lib/runtime/workforce-os.functions';
import { useSessionReady } from '@/lib/useSessionReady';

function Metric({ label, value, Icon }) {
  return (
    <div className="rounded-xl border border-white/[.08] bg-white/[.025] p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-[.16em] text-zinc-500">{label}</span>
        <Icon className="h-3.5 w-3.5 text-violet-300" />
      </div>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

export default function WorkforceOSPanel() {
  const session = useSessionReady();
  const load = useServerFn(getWorkforceOperatingState);
  const query = useQuery({
    queryKey: ['blackstar-workforce-os'],
    queryFn: () => load(),
    enabled: session === 'yes',
    retry: false,
    refetchInterval: 15000,
  });

  if (session !== 'yes') return null;

  return (
    <section className="mb-8 rounded-2xl border border-white/[.07] bg-black/25 p-4 backdrop-blur-xl sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.2em] text-violet-300/70">
            <ShieldCheck className="h-3.5 w-3.5" /> Workforce OS
          </div>
          <h2 className="mt-1 text-base font-semibold text-white">Operating & governance state</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-500">Live supervision across workforce membership, durable runs, autonomous fleet assignments, Trust Fabric passports, delegations and approval pressure.</p>
        </div>
        {query.isSuccess ? (
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider ${query.data.governance.healthy ? 'border-emerald-300/20 bg-emerald-300/[.06] text-emerald-200' : 'border-rose-300/20 bg-rose-300/[.06] text-rose-200'}`}>
            {query.data.governance.healthy ? 'Governed' : 'Action required'}
          </span>
        ) : null}
      </div>

      {query.isLoading ? <p className="mt-4 text-xs text-zinc-500">Loading authoritative workforce state…</p> : null}
      {query.isError ? <p className="mt-4 text-xs text-rose-300">The complete Workforce OS state could not be verified, so Blackstar is not presenting partial governance data as healthy.</p> : null}

      {query.isSuccess ? (
        <>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Workforces" value={query.data.stats.activeWorkforces} Icon={Users} />
            <Metric label="Assigned agents" value={query.data.stats.assignedAgents} Icon={Users} />
            <Metric label="Passport coverage" value={`${query.data.stats.passportCoverage}%`} Icon={IdCard} />
            <Metric label="Live runs" value={query.data.stats.liveWorkflowRuns} Icon={Workflow} />
            <Metric label="Fleet assignments" value={query.data.stats.activeFleetAssignments} Icon={Activity} />
            <Metric label="Delegations" value={query.data.stats.activeDelegations} Icon={GitBranch} />
            <Metric label="Approvals" value={query.data.stats.pendingApprovals} Icon={ShieldAlert} />
            <Metric label="High autonomy" value={query.data.stats.highAutonomyPassports} Icon={ShieldCheck} />
          </div>

          <div className="mt-4 space-y-2">
            {query.data.governance.risks.length ? query.data.governance.risks.map((risk) => (
              <div key={risk.code} className={`rounded-xl border px-3 py-2.5 text-xs leading-5 ${risk.severity === 'critical' ? 'border-rose-300/15 bg-rose-300/[.04] text-rose-200' : 'border-amber-300/15 bg-amber-300/[.04] text-amber-100'}`}>
                {risk.message}
              </div>
            )) : (
              <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[.035] px-3 py-2.5 text-xs text-emerald-200">No critical workforce governance gaps detected in the current authenticated scope.</div>
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}
