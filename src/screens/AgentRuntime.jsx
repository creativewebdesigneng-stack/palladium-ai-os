import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Link } from 'react-router-dom';
import { Activity, Bot, CheckCircle2, GitBranch, IdCard, LockKeyhole, Network, ShieldCheck, Workflow } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { Failed, Loading } from '@/components/business/live';
import { friendlyMessage } from '@/lib/errors';
import { useSessionReady } from '@/lib/useSessionReady';
import { getHarnessOverview } from '@/lib/runtime/harness.functions';

function Stat({ label, value, Icon }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{label}</p>
        <Icon className="h-4 w-4 text-violet-300" />
      </div>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

const SURFACES = [
  ['Skills & Tools', '/skills', 'Manage reusable agent capabilities and tool grants.'],
  ['MCP Hub', '/mcp-hub', 'Manage Model Context Protocol servers and tools.'],
  ['Memory Fabric', '/memory', 'Inspect durable governed agent memory and learned context.'],
  ['Workflows', '/workflows', 'Build and operate durable multi-step work.'],
  ['AI Workforce', '/workforce', 'Manage agents and delegated work.'],
  ['Models', '/models', 'Configure provider-neutral model routing.'],
  ['Terminal', '/terminal', 'Use the existing controlled terminal surface.'],
];

export default function AgentRuntime() {
  const session = useSessionReady();
  const overviewFn = useServerFn(getHarnessOverview);
  const overview = useQuery({
    queryKey: ['blackstar-control-plane'],
    queryFn: () => overviewFn({ data: {} }),
    enabled: session === 'yes',
    retry: false,
    refetchInterval: 15000,
  });

  return (
    <>
      <PageHeader
        eyebrow="Blackstar infrastructure"
        title="Control Plane"
        description="One live control plane for Blackstar runtime activity, Trust Fabric identity, passports, A2A traffic, approvals, tools, sandbox guardrails and delegated execution."
      />

      {session === 'no' && <Failed message="Sign in to inspect the Blackstar control plane." />}
      {session === 'yes' && overview.isLoading && <Loading label="Loading control-plane state…" />}
      {overview.isError && <Failed message={friendlyMessage(overview.error)} onRetry={() => overview.refetch()} />}

      {overview.isSuccess && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Agents" value={overview.data.stats.agents} Icon={Bot} />
            <Stat label="Live runs" value={overview.data.stats.liveRuns} Icon={Activity} />
            <Stat label="Trusted identities" value={overview.data.stats.trustedIdentities} Icon={ShieldCheck} />
            <Stat label="Passports" value={overview.data.stats.passports} Icon={IdCard} />
            <Stat label="Live A2A" value={overview.data.stats.liveA2aMessages} Icon={Network} />
            <Stat label="Delegations" value={overview.data.stats.activeDelegations} Icon={GitBranch} />
            <Stat label="Pending approvals" value={overview.data.stats.pendingApprovals} Icon={ShieldCheck} />
            <Stat label="Enabled tool grants" value={overview.data.stats.enabledToolGrants} Icon={CheckCircle2} />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.4fr_.9fr]">
            <section className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="mb-4 flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-violet-300" />
                <h2 className="font-semibold text-white">Runtime capabilities</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {overview.data.capabilities.map((capability) => (
                  <Link key={capability.id} to={capability.surface} className="rounded-xl border border-white/10 bg-white/[.025] p-4 transition hover:border-violet-400/30 hover:bg-white/[.05]">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-white">{capability.label}</p>
                      <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-violet-200">{capability.mode}</span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-zinc-400">{capability.description}</p>
                  </Link>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="mb-4 flex items-center gap-2">
                <LockKeyhole className="h-4 w-4 text-violet-300" />
                <h2 className="font-semibold text-white">Execution guardrails</h2>
              </div>
              <div className="space-y-2 text-sm">
                {[
                  ['Safe read-only work', overview.data.policy.safeReads],
                  ['Writes and mutations', overview.data.policy.writes],
                  ['External side effects', overview.data.policy.externalEffects],
                  ['Credential input', overview.data.policy.credentials],
                  ['Privileged sandbox', overview.data.policy.privilegedSandbox],
                  ['Sub-agent escalation', overview.data.policy.subagentEscalation],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[.025] px-3 py-2.5">
                    <span className="text-zinc-300">{label}</span>
                    <span className="font-mono text-xs text-violet-200">{value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/10 bg-white/[.025] p-3 text-xs leading-5 text-zinc-400">
                <Network className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
                Network targets stay bounded by each agent&apos;s domain allow-list. Child agents inherit a subset of parent tools and are capped at {overview.data.policy.maxSubagentDepth} delegation levels by default.
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="mb-4 flex items-center gap-2"><Network className="h-4 w-4 text-violet-300" /><h2 className="font-semibold text-white">Trust Fabric & A2A network</h2></div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-white/10 bg-white/[.025] p-4">
                <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">Identity fabric</p>
                <p className="mt-2 text-sm text-zinc-300">{overview.data.stats.trustedIdentities} active canonical identities are visible through your authenticated scope.</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[.025] p-4">
                <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">Agent passports</p>
                <p className="mt-2 text-sm text-zinc-300">{overview.data.stats.passports} governed passports describe capability, autonomy and risk boundaries.</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[.025] p-4">
                <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">Delegation fabric</p>
                <p className="mt-2 text-sm text-zinc-300">{overview.data.stats.activeDelegations} active scoped grants. External actions remain approval-governed by policy.</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[.025] p-4">
                <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">A2A transport</p>
                <p className="mt-2 text-sm text-zinc-300">{overview.data.stats.liveA2aMessages} queued, approval-pending or delivered message envelopes are in the current owner scope.</p>
              </div>
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-2">
            <section className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="mb-4 flex items-center gap-2"><Activity className="h-4 w-4 text-violet-300" /><h2 className="font-semibold text-white">Recent runtime activity</h2></div>
              <div className="space-y-2">
                {overview.data.tasks.slice(0, 8).map((task) => (
                  <div key={task.id} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[.025] px-3 py-2.5 text-sm">
                    <span className="truncate text-zinc-300">Run {String(task.id).slice(0, 8)}</span>
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-zinc-400">{task.status}</span>
                  </div>
                ))}
                {overview.data.tasks.length === 0 && <p className="text-sm text-zinc-500">No agent runs yet.</p>}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="mb-4 flex items-center gap-2"><Workflow className="h-4 w-4 text-violet-300" /><h2 className="font-semibold text-white">Control-plane surfaces</h2></div>
              <div className="grid gap-2 sm:grid-cols-2">
                {SURFACES.map(([label, path, description]) => (
                  <Link key={path} to={path} className="rounded-xl border border-white/10 bg-white/[.025] p-3 transition hover:border-violet-400/30 hover:bg-white/[.05]">
                    <p className="text-sm font-medium text-white">{label}</p>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
