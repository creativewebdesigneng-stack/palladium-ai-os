import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  ClipboardCheck,
  Database,
  ExternalLink,
  Loader2,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import Panel from '@/components/palladium/Panel';
import { useWorkspace } from '@/hooks/use-workspace';
import { OPERATIONAL_ACCEPTANCE_ITEMS } from '@/lib/admin/acceptance-catalog';
import { getOperationalAcceptanceSnapshot } from '@/lib/admin/acceptance.functions';

const TONES = {
  owner: 'border-violet-400/20 bg-violet-400/[.055] text-violet-200',
  provider: 'border-sky-400/20 bg-sky-400/[.055] text-sky-200',
  device: 'border-fuchsia-400/20 bg-fuchsia-400/[.055] text-fuchsia-200',
  transaction: 'border-amber-400/20 bg-amber-400/[.055] text-amber-200',
  professional: 'border-rose-400/20 bg-rose-400/[.055] text-rose-200',
  independent: 'border-indigo-400/20 bg-indigo-400/[.055] text-indigo-200',
  conditional: 'border-zinc-400/20 bg-white/[.035] text-zinc-300',
};

function evidenceFor(item, snapshot) {
  const keys = item.evidenceKeys ?? [];
  if (!keys.length) return { count: null, available: true };
  return keys.reduce(
    (acc, key) => {
      const entry = snapshot?.evidence?.[key];
      if (!entry) return acc;
      return {
        count: acc.count + Number(entry.count ?? 0),
        available: acc.available && entry.available !== false,
      };
    },
    { count: 0, available: true },
  );
}

export default function AdminAcceptance() {
  const { session } = useWorkspace();
  const snapshotFn = useServerFn(getOperationalAcceptanceSnapshot);
  const snapshot = useQuery({
    queryKey: ['admin-operational-acceptance'],
    queryFn: () => snapshotFn(),
    enabled: session === 'yes',
    retry: false,
    refetchInterval: 60_000,
  });

  if (session !== 'yes' || snapshot.isLoading) {
    return (
      <>
        <PageHeader
          eyebrow="Blackstar Control Plane"
          title="Operational Acceptance"
          description="Real-world certification without synthetic evidence."
        />
        <div className="flex items-center gap-2 rounded-2xl border border-violet-300/10 bg-black/30 p-6 text-sm text-zinc-400 backdrop-blur-xl">
          <Loader2 className="h-4 w-4 animate-spin text-violet-300" />
          Reading the production evidence ledger…
        </div>
      </>
    );
  }

  if (snapshot.data?.forbidden || snapshot.error) {
    return (
      <>
        <PageHeader
          eyebrow="Blackstar Control Plane"
          title="Operational Acceptance"
          description="Real-world certification without synthetic evidence."
        />
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/[.06] p-10 text-center">
          <Lock className="h-8 w-8 text-rose-300" />
          <p className="text-sm font-medium text-rose-200">Administrative access is required.</p>
          <p className="text-xs text-rose-200/70">The acceptance snapshot is re-verified server-side.</p>
        </div>
      </>
    );
  }

  const data = snapshot.data;
  const ownerFirst = OPERATIONAL_ACCEPTANCE_ITEMS.filter((item) => item.priority === 'owner-first');
  const linkedEvidence = OPERATIONAL_ACCEPTANCE_ITEMS.filter((item) => (item.evidenceKeys ?? []).length > 0);
  const withEvidence = linkedEvidence.filter((item) => evidenceFor(item, data).count > 0);
  const zeroEvidence = linkedEvidence.length - withEvidence.length;

  return (
    <>
      <PageHeader
        eyebrow="Blackstar Control Plane"
        title="Operational Acceptance"
        description="Execute the remaining owner, provider, device and independent certification gates without reopening completed engineering."
        action={
          <span className="flex items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[11px] font-medium text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Engineering release gate complete
          </span>
        }
      />

      <div className="mb-5 flex items-start gap-2 rounded-xl border border-amber-300/10 bg-amber-400/[.035] px-3 py-2 text-[11px] text-amber-100/80">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
        <p>Production record counts are evidence availability only. They never convert an item to Verified without the required authorised provider, device, owner, transaction, professional or independent evidence.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Engineering gate" value="100%" detail="certified release scope" icon={CheckCircle2} />
        <Metric label="Acceptance gates" value={String(OPERATIONAL_ACCEPTANCE_ITEMS.length)} detail="U01–U24" icon={ClipboardCheck} />
        <Metric label="Owner-first" value={String(ownerFirst.length)} detail="U01 · U04 · U23" icon={ArrowRight} />
        <Metric label="Evidence-linked zeroes" value={String(zeroEvidence)} detail="not engineering failures" icon={Database} />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <Panel title="First real-owner acceptance" subtitle="These are the next product behaviours that require genuine owner action.">
          <div className="space-y-3">
            {ownerFirst.map((item) => (
              <AcceptanceRow key={item.id} item={item} snapshot={data} compact />
            ))}
          </div>
        </Panel>

        <Panel title="Evidence policy" subtitle="Blackstar's certification boundary">
          <div className="space-y-3 text-xs leading-5 text-zinc-400">
            <Policy icon={CheckCircle2} title="Automatically certifiable" text="Engineering, CI, deployment and database structure may be certified from authoritative system evidence." />
            <Policy icon={CircleDashed} title="Externally contingent" text="Provider, device, transaction, real-business-data and specialist gates remain open until the real dependency exists." />
            <Policy icon={ExternalLink} title="No synthetic completion" text="Mocks, seeded owner rows and screenshots without authoritative provider/device evidence do not close an acceptance gate." />
          </div>
          <p className="mt-4 text-[10px] text-zinc-600">
            Snapshot {data?.checkedAt ? new Date(data.checkedAt).toLocaleString() : 'unavailable'} · refreshes every 60 seconds.
          </p>
        </Panel>
      </div>

      <div className="mt-5">
        <Panel title="Real-world certification queue" subtitle="Every remaining acceptance gate, its dependency, evidence standard and existing Blackstar execution surface.">
          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {OPERATIONAL_ACCEPTANCE_ITEMS.map((item) => (
              <AcceptanceRow key={item.id} item={item} snapshot={data} />
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

function Metric({ label, value, detail, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-white/[.08] bg-black/30 p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-zinc-600">{label}</p>
        <Icon className="h-4 w-4 text-violet-300" />
      </div>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-[11px] text-zinc-500">{detail}</p>
    </div>
  );
}

function Policy({ icon: Icon, title, text }) {
  return (
    <div className="flex gap-3 rounded-xl border border-white/[.06] bg-white/[.02] p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
      <div>
        <p className="font-medium text-zinc-200">{title}</p>
        <p className="mt-1 text-zinc-500">{text}</p>
      </div>
    </div>
  );
}

function AcceptanceRow({ item, snapshot, compact = false }) {
  const evidence = evidenceFor(item, snapshot);
  const hasCount = evidence.count != null;
  const hasEvidence = hasCount && evidence.count > 0;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/[.07] bg-black/25 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] tracking-[.14em] text-violet-300">{item.id}</span>
            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-[.12em] ${TONES[item.category]}`}>
              {item.category}
            </span>
            {item.priority === 'owner-first' && (
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[.07] px-2 py-0.5 text-[9px] font-medium uppercase tracking-[.12em] text-emerald-300">
                next
              </span>
            )}
          </div>
          <h3 className="mt-2 text-sm font-semibold text-white">{item.title}</h3>
        </div>
        {hasCount && (
          <span className={`shrink-0 rounded-lg border px-2 py-1 text-[10px] ${hasEvidence ? 'border-emerald-400/20 bg-emerald-400/[.06] text-emerald-300' : 'border-white/[.08] bg-white/[.02] text-zinc-500'}`}>
            {evidence.available ? `${evidence.count} record${evidence.count === 1 ? '' : 's'}` : 'count unavailable'}
          </span>
        )}
      </div>

      <p className="mt-3 text-[11px] leading-5 text-zinc-500">
        <span className="text-zinc-300">Dependency:</span> {item.dependency}
      </p>
      {!compact && (
        <p className="mt-2 text-[11px] leading-5 text-zinc-500">
          <span className="text-zinc-300">Acceptance:</span> {item.evidence}
        </p>
      )}

      <div className="mt-auto pt-4">
        <Link
          to={item.path}
          className="inline-flex items-center gap-1.5 rounded-xl border border-violet-300/15 bg-violet-500/[.06] px-3 py-2 text-[11px] font-medium text-violet-100 transition hover:border-violet-300/30 hover:bg-violet-500/[.1]"
        >
          {item.action}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
