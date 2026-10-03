import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Box,
  CheckCircle2,
  CircleDashed,
  ClipboardCheck,
  Database,
  ExternalLink,
  Loader2,
  Lock,
  Save,
  ShieldCheck,
} from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import Panel from '@/components/palladium/Panel';
import { useWorkspace } from '@/hooks/use-workspace';
import { OPERATIONAL_ACCEPTANCE_ITEMS } from '@/lib/admin/acceptance-catalog';
import {
  recordedVerificationHasLinkedEvidence,
  summarizeAcceptanceEvidence,
} from '@/lib/admin/acceptance-evidence';
import { operationalProbeLabel } from '@/lib/admin/acceptance-preflight';
import {
  getOperationalAcceptanceSnapshot,
  runOperationalAcceptancePreflight,
  saveOperationalAcceptanceResult,
} from '@/lib/admin/acceptance.functions';
import { friendlyMessage } from '@/lib/errors';

const TONES = {
  owner: 'border-violet-400/20 bg-violet-400/[.055] text-violet-200',
  provider: 'border-sky-400/20 bg-sky-400/[.055] text-sky-200',
  device: 'border-fuchsia-400/20 bg-fuchsia-400/[.055] text-fuchsia-200',
  transaction: 'border-amber-400/20 bg-amber-400/[.055] text-amber-200',
  professional: 'border-rose-400/20 bg-rose-400/[.055] text-rose-200',
  independent: 'border-indigo-400/20 bg-indigo-400/[.055] text-indigo-200',
  conditional: 'border-zinc-400/20 bg-white/[.035] text-zinc-300',
};

const RESULT_TONES = {
  verified: 'border-emerald-400/20 bg-emerald-400/[.07] text-emerald-300',
  failed: 'border-rose-400/20 bg-rose-400/[.07] text-rose-300',
  declined: 'border-zinc-400/20 bg-white/[.035] text-zinc-400',
  waiting: 'border-amber-400/20 bg-amber-400/[.06] text-amber-300',
};

const RESULT_LABELS = {
  verified: 'Verified',
  failed: 'Failed',
  declined: 'Declined',
  waiting: 'Waiting',
};

export default function AdminAcceptance() {
  const { session } = useWorkspace();
  const qc = useQueryClient();
  const snapshotFn = useServerFn(getOperationalAcceptanceSnapshot);
  const preflightFn = useServerFn(runOperationalAcceptancePreflight);
  const saveResultFn = useServerFn(saveOperationalAcceptanceResult);
  const snapshot = useQuery({
    queryKey: ['admin-operational-acceptance'],
    queryFn: () => snapshotFn(),
    enabled: session === 'yes',
    retry: false,
    refetchInterval: 60_000,
  });
  const preflight = useMutation({
    mutationFn: async () => {
      const result = await preflightFn();
      if (result?.forbidden) throw new Error('Administrative access is required.');
      return result;
    },
  });
  const saveResult = useMutation({
    mutationFn: async (payload) => {
      const result = await saveResultFn({ data: payload });
      if (result?.forbidden) throw new Error('Administrative access is required.');
      return result;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-operational-acceptance'] });
    },
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
  const withEvidence = linkedEvidence.filter(
    (item) => (summarizeAcceptanceEvidence(item.evidenceKeys, data?.evidence).total ?? 0) > 0,
  );
  const zeroEvidence = linkedEvidence.length - withEvidence.length;
  const recordedResults = Object.values(data?.results ?? {});
  const verifiedResults = recordedResults.filter((result) => result.status === 'verified').length;
  const verifiedWithLinkedEvidence = OPERATIONAL_ACCEPTANCE_ITEMS.filter((item) =>
    recordedVerificationHasLinkedEvidence(
      data?.results?.[item.id]?.status,
      summarizeAcceptanceEvidence(item.evidenceKeys, data?.evidence),
    ),
  ).length;

  return (
    <>
      <PageHeader
        eyebrow="Blackstar Control Plane"
        title="Operational Acceptance"
        description="Execute and record the remaining owner, provider, device and independent certification gates without reopening completed engineering."
        action={
          <span className="flex items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[11px] font-medium text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Engineering release gate complete
          </span>
        }
      />

      <div className="mb-5 flex items-start gap-2 rounded-xl border border-amber-300/10 bg-amber-400/[.035] px-3 py-2 text-[11px] text-amber-100/80">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
        <p>Production record counts are evidence availability only. A recorded result documents the signed-in owner's observation; it never manufactures provider, device, transaction, professional or independent evidence. Verified requires an evidence reference and explanatory note.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Engineering gate" value="100%" detail="certified release scope" icon={CheckCircle2} />
        <Metric label="Acceptance gates" value={String(OPERATIONAL_ACCEPTANCE_ITEMS.length)} detail="U01–U24" icon={ClipboardCheck} />
        <Metric label="Recorded outcomes" value={String(recordedResults.length)} detail={`${verifiedResults} recorded verified · ${verifiedWithLinkedEvidence} with linked evidence`} icon={Save} />
        <Metric label="Evidence-linked zeroes" value={String(zeroEvidence)} detail="not engineering failures" icon={Database} />
      </div>

      <div className="mt-5">
        <Panel
          title="Read-only operational preflight"
          subtitle="Probe current remote MCP, Cinema and 3D readiness without creating jobs, outputs or acceptance results."
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-3xl">
              <p className="text-xs leading-5 text-zinc-400">
                This calls the governed remote MCP discovery check and existing bounded worker health probes on demand. Healthy means the advertised endpoint or worker path is reachable now; it does not prove an external client connected, a render completed, a persisted output exists, a ZModeler handoff ran or final certification passed.
              </p>
              <p className="mt-1 text-[10px] text-zinc-600">
                Relevant gates: U06 external AI/MCP acceptance, U07 Cinema provider/worker acceptance and U08 3D/Game Foundry provider/worker acceptance.
              </p>
            </div>
            <button
              type="button"
              disabled={preflight.isPending}
              onClick={() => preflight.mutate()}
              className="inline-flex items-center gap-2 rounded-xl border border-sky-300/20 bg-sky-400/[.06] px-3 py-2 text-[11px] font-medium text-sky-100 transition hover:border-sky-300/35 hover:bg-sky-400/[.1] disabled:opacity-50"
            >
              {preflight.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5" />}
              {preflight.isPending ? 'Checking…' : 'Run read-only preflight'}
            </button>
          </div>

          {preflight.error && (
            <p className="mt-3 text-[11px] text-rose-300">{friendlyMessage(preflight.error)}</p>
          )}

          {preflight.data && !preflight.data.forbidden ? (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <PreflightCard
                icon={ExternalLink}
                title="Remote MCP identity"
                probe={preflight.data.mcp}
              />
              <PreflightCard
                icon={ShieldCheck}
                title="Cinema master worker"
                probe={preflight.data.cinema}
              />
              <PreflightCard
                icon={Box}
                title="3D Studio worker"
                probe={preflight.data.threeD}
              />
              <p className="md:col-span-3 text-[10px] leading-4 text-zinc-600">
                Checked {preflight.data.checkedAt ? new Date(preflight.data.checkedAt).toLocaleString('en-GB') : 'now'} · Readiness is not external-client connection or render certification. No acceptance outcome was saved by this preflight.
              </p>
            </div>
          ) : (
            !preflight.isPending && (
              <div className="mt-4 rounded-xl border border-white/[.06] bg-white/[.018] p-4 text-[11px] text-zinc-500">
                No live preflight has been run in this session.
              </div>
            )
          )}
        </Panel>
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
        <Panel title="Real-world certification queue" subtitle="Every remaining acceptance gate, its dependency, evidence standard, current recorded outcome and existing Blackstar execution surface.">
          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {OPERATIONAL_ACCEPTANCE_ITEMS.map((item) => (
              <AcceptanceRow
                key={item.id}
                item={item}
                snapshot={data}
                onSave={(payload) => saveResult.mutateAsync(payload)}
                saving={saveResult.isPending && saveResult.variables?.itemId === item.id}
                saveError={saveResult.error && saveResult.variables?.itemId === item.id ? saveResult.error : null}
              />
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

function PreflightCard({ icon: Icon, title, probe }) {
  const label = operationalProbeLabel(probe);
  const ready = label === 'Ready';
  const tone = ready
    ? 'border-emerald-400/15 bg-emerald-400/[.035]'
    : probe?.reachable
      ? 'border-amber-400/15 bg-amber-400/[.035]'
      : 'border-rose-400/15 bg-rose-400/[.035]';

  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${ready ? 'text-emerald-300' : 'text-zinc-400'}`} />
          <div>
            <p className="text-xs font-medium text-zinc-200">{title}</p>
            <p className="mt-0.5 text-[10px] text-zinc-600">{probe?.provider ?? 'unknown provider'}</p>
          </div>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-[.12em] ${
          ready
            ? 'border-emerald-400/20 text-emerald-300'
            : probe?.reachable
              ? 'border-amber-400/20 text-amber-300'
              : 'border-rose-400/20 text-rose-300'
        }`}>
          {label}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-zinc-500">
        <span>Configured <strong className="font-medium text-zinc-300">{probe?.configured ? 'yes' : 'no'}</strong></span>
        <span>Reachable <strong className="font-medium text-zinc-300">{probe?.reachable ? 'yes' : 'no'}</strong></span>
        <span>HTTP <strong className="font-medium text-zinc-300">{probe?.httpStatus ?? '—'}</strong></span>
        <span>Latency <strong className="font-medium text-zinc-300">{probe?.latencyMs != null ? `${probe.latencyMs} ms` : '—'}</strong></span>
      </div>
      {probe?.error && <p className="mt-2 text-[10px] leading-4 text-amber-200/75">{probe.error}</p>}
    </div>
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

function AcceptanceRow({
  item,
  snapshot,
  compact = false,
  onSave,
  saving = false,
  saveError = null,
}) {
  const evidence = summarizeAcceptanceEvidence(item.evidenceKeys, snapshot?.evidence);
  const result = snapshot?.results?.[item.id] ?? null;
  const hasCount = evidence.linked;
  const hasEvidence = hasCount && (evidence.total ?? 0) > 0;
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState(result?.status ?? 'waiting');
  const [reference, setReference] = useState(result?.evidenceReference ?? '');
  const [notes, setNotes] = useState(result?.notes ?? '');

  useEffect(() => {
    setStatus(result?.status ?? 'waiting');
    setReference(result?.evidenceReference ?? '');
    setNotes(result?.notes ?? '');
  }, [result?.status, result?.evidenceReference, result?.notes]);

  const valid =
    status === 'verified'
      ? reference.trim().length >= 3 && notes.trim().length >= 10
      : status === 'failed'
        ? notes.trim().length >= 10
        : true;

  const submit = async () => {
    if (!onSave || !valid) return;
    try {
      await onSave({
        itemId: item.id,
        status,
        evidenceReference: reference.trim(),
        notes: notes.trim(),
      });
      setEditing(false);
    } catch {
      // Mutation error is rendered below without converting it into acceptance.
    }
  };

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
            {result && (
              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-[.12em] ${RESULT_TONES[result.status] ?? RESULT_TONES.waiting}`}>
                {RESULT_LABELS[result.status] ?? result.status}
              </span>
            )}
          </div>
          <h3 className="mt-2 text-sm font-semibold text-white">{item.title}</h3>
        </div>
        {hasCount && (
          <span className={`shrink-0 rounded-lg border px-2 py-1 text-[10px] ${hasEvidence ? 'border-emerald-400/20 bg-emerald-400/[.06] text-emerald-300' : 'border-white/[.08] bg-white/[.02] text-zinc-500'}`}>
            {evidence.available
              ? `${evidence.total} record${evidence.total === 1 ? '' : 's'} · ${evidence.presentSources}/${evidence.sourceCount} sources`
              : 'evidence incomplete'}
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

      {!compact && evidence.linked && (
        <div className="mt-3 rounded-xl border border-white/[.06] bg-white/[.018] p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-300">
              <Database className="h-3.5 w-3.5 text-violet-300" />
              Linked production evidence
            </p>
            <span className="text-[9px] uppercase tracking-[.12em] text-zinc-600">
              {evidence.presentSources}/{evidence.sourceCount} sources
            </span>
          </div>
          <div className="mt-2 space-y-1.5">
            {evidence.sources.map((source) => (
              <div
                key={source.key}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/[.05] bg-black/20 px-2.5 py-1.5 text-[10px]"
              >
                <span className="min-w-0 truncate font-mono text-zinc-500">{source.table}</span>
                <span className={source.present ? 'text-emerald-300' : source.available ? 'text-zinc-600' : 'text-amber-300'}>
                  {source.available ? `${source.count} record${source.count === 1 ? '' : 's'}` : 'unavailable'}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[9px] leading-4 text-zinc-600">
            {!evidence.available
              ? 'At least one linked evidence source could not be read. Blackstar will not treat an incomplete snapshot as corroboration.'
              : hasEvidence
                ? 'Records exist for review. Their presence supports investigation but does not automatically certify this gate.'
                : 'No linked production evidence is currently visible for this gate.'}
          </p>
        </div>
      )}

      {!compact && result?.status === 'verified' && evidence.linked && (!evidence.available || !hasEvidence) && (
        <div className="mt-3 flex gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[.055] p-3 text-[10px] leading-5 text-amber-100/80">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
          <p>
            This gate is recorded as Verified, but Blackstar cannot currently see linked production evidence for it.
            Treat the saved result as an owner observation, not evidence-backed certification.
          </p>
        </div>
      )}

      {result && (
        <div className="mt-3 rounded-xl border border-white/[.06] bg-white/[.02] p-3 text-[10px] leading-5 text-zinc-500">
          <p><span className="text-zinc-300">Recorded:</span> {RESULT_LABELS[result.status] ?? result.status}{result.observedAt ? ` · ${new Date(result.observedAt).toLocaleString('en-GB')}` : ''}</p>
          {result.evidenceReference && <p className="break-words"><span className="text-zinc-300">Reference:</span> {result.evidenceReference}</p>}
          {result.notes && <p className="break-words"><span className="text-zinc-300">Note:</span> {result.notes}</p>}
        </div>
      )}

      {!compact && editing && (
        <div className="mt-3 space-y-3 rounded-xl border border-violet-300/10 bg-violet-500/[.035] p-3">
          <div>
            <label className="text-[9px] font-semibold uppercase tracking-[.14em] text-zinc-600">Outcome</label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0b0c12] px-2.5 py-2 text-xs text-zinc-200 outline-none focus:border-violet-400/40"
            >
              <option value="waiting">Waiting</option>
              <option value="verified">Verified</option>
              <option value="failed">Failed</option>
              <option value="declined">Declined / out of scope</option>
            </select>
          </div>
          <div>
            <label className="text-[9px] font-semibold uppercase tracking-[.14em] text-zinc-600">Evidence reference</label>
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value.slice(0, 500))}
              placeholder="Provider ID, deployment, device test, review record…"
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-xs text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-violet-400/40"
            />
          </div>
          <div>
            <label className="text-[9px] font-semibold uppercase tracking-[.14em] text-zinc-600">Observation / symptom</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value.slice(0, 2000))}
              rows={3}
              placeholder="Describe what was genuinely observed. Do not paste secrets or private customer data."
              className="mt-1.5 w-full resize-none rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-xs leading-5 text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-violet-400/40"
            />
          </div>
          {status === 'verified' && !valid && (
            <p className="text-[10px] text-amber-300">Verified requires a reference plus an explanatory note of at least 10 characters.</p>
          )}
          {status === 'failed' && !valid && (
            <p className="text-[10px] text-amber-300">Failed requires a reproducible symptom or explanatory note of at least 10 characters.</p>
          )}
          {saveError && <p className="text-[10px] text-rose-300">{friendlyMessage(saveError)}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!valid || saving}
              onClick={submit}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500 px-3 py-2 text-[10px] font-semibold text-white hover:bg-violet-400 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {saving ? 'Saving…' : 'Save outcome'}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setEditing(false)}
              className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-medium text-zinc-400 hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        <Link
          to={item.path}
          className="inline-flex items-center gap-1.5 rounded-xl border border-violet-300/15 bg-violet-500/[.06] px-3 py-2 text-[11px] font-medium text-violet-100 transition hover:border-violet-300/30 hover:bg-violet-500/[.1]"
        >
          {item.action}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        {!compact && (
          <button
            type="button"
            onClick={() => setEditing((value) => !value)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[.025] px-3 py-2 text-[11px] font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/[.05]"
          >
            <Save className="h-3.5 w-3.5" />
            {result ? 'Update result' : 'Record result'}
          </button>
        )}
      </div>
    </div>
  );
}
