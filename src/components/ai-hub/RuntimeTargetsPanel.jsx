import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { Activity, Ban, Copy, RotateCcw, ServerCog, ShieldCheck } from 'lucide-react'
import { friendlyMessage } from '@/lib/errors'
import {
  listAiHubRuntimeTargets,
  registerAiHubRuntimeTarget,
  revokeAiHubRuntimeTarget,
  rotateAiHubRuntimeTargetToken,
} from '@/lib/ai-hub/runtime-targets.functions'

function targetState(target) {
  if (target.revoked_at) return { label: 'revoked', tone: 'text-zinc-500 border-white/10 bg-white/[.03]' }
  if (!target.attested_at || !target.expires_at) return { label: 'awaiting heartbeat', tone: 'text-amber-300 border-amber-400/20 bg-amber-400/[.08]' }
  if (Date.parse(target.expires_at) <= Date.now()) return { label: 'stale', tone: 'text-amber-300 border-amber-400/20 bg-amber-400/[.08]' }
  if (target.health === 'healthy') return { label: 'healthy', tone: 'text-emerald-300 border-emerald-400/20 bg-emerald-400/[.08]' }
  return { label: target.health || 'offline', tone: 'text-orange-300 border-orange-400/20 bg-orange-400/[.08]' }
}

function SecretBox({ issued, onClear }) {
  if (!issued) return null
  const payload = JSON.stringify({ targetId: issued.targetId ?? issued.target?.id, health: 'healthy' })
  return <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/[.06] p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-emerald-100">Runtime secret issued once</p>
        <p className="mt-1 text-xs leading-5 text-emerald-100/65">Store this secret on the target node. Blackstar stores only its SHA-256 digest and will not show this value again.</p>
      </div>
      <button type="button" onClick={onClear} className="text-xs text-emerald-100/60 hover:text-emerald-100">Hide</button>
    </div>
    <div className="mt-3 rounded-lg border border-white/10 bg-black/35 p-3">
      <div className="flex items-center justify-between gap-3">
        <code className="break-all text-[11px] text-emerald-100">{issued.token}</code>
        <button type="button" onClick={() => navigator.clipboard?.writeText(issued.token)} className="shrink-0 rounded-md border border-white/10 p-2 text-zinc-300 hover:bg-white/[.05]" title="Copy secret"><Copy className="h-3.5 w-3.5" /></button>
      </div>
    </div>
    <div className="mt-3 space-y-2 text-xs text-zinc-400">
      <p><span className="text-zinc-500">Heartbeat:</span> every {issued.heartbeatEverySeconds ?? 300}s · attestation expires after {issued.expiresAfterSeconds ?? 600}s without a valid heartbeat.</p>
      <p className="break-all"><span className="text-zinc-500">POST:</span> {issued.heartbeatUrl}</p>
      <p className="break-all"><span className="text-zinc-500">JSON:</span> <code>{payload}</code></p>
      <p>Send the secret as <code>Authorization: Bearer &lt;secret&gt;</code>. Do not put it in the JSON body or source control.</p>
    </div>
  </div>
}

export default function RuntimeTargetsPanel({ session }) {
  const listTargets = useServerFn(listAiHubRuntimeTargets)
  const registerTarget = useServerFn(registerAiHubRuntimeTarget)
  const rotateToken = useServerFn(rotateAiHubRuntimeTargetToken)
  const revokeTarget = useServerFn(revokeAiHubRuntimeTarget)
  const [name, setName] = useState('')
  const [deploymentTarget, setDeploymentTarget] = useState('on-prem')
  const [region, setRegion] = useState('')
  const [orgId, setOrgId] = useState('')
  const [issued, setIssued] = useState(null)

  const inventory = useQuery({
    queryKey: ['ai-hub-runtime-targets'],
    queryFn: () => listTargets(),
    enabled: session === 'yes',
    retry: false,
    refetchInterval: 15000,
  })

  const registration = useMutation({
    mutationFn: () => registerTarget({ data: {
      name: name.trim(),
      deploymentTarget,
      region: region.trim() || null,
      orgId: orgId || null,
    } }),
    onSuccess: (result) => {
      setIssued({ ...result, targetId: result.target.id })
      setName('')
      inventory.refetch()
    },
  })

  const rotation = useMutation({
    mutationFn: (targetId) => rotateToken({ data: { targetId } }),
    onSuccess: (result) => {
      setIssued(result)
      inventory.refetch()
    },
  })

  const revocation = useMutation({
    mutationFn: (targetId) => revokeTarget({ data: { targetId } }),
    onSuccess: () => inventory.refetch(),
  })

  const orgById = useMemo(() => new Map((inventory.data?.organisations ?? []).map((org) => [org.id, org.name])), [inventory.data?.organisations])
  const active = (inventory.data?.targets ?? []).filter((target) => !target.revoked_at).length

  return <section className="relative overflow-hidden rounded-[26px] border border-sky-300/10 bg-black/35 p-5 shadow-[0_24px_80px_rgba(0,0,0,.20)] backdrop-blur-xl">
    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-200/25 to-transparent" />
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-300/15 bg-sky-400/[.07]"><ServerCog className="h-4 w-4 text-sky-300" /></div>
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[.24em] text-sky-300/60">Portable runtime control plane</p>
          <h2 className="mt-1 text-lg font-semibold text-white">Customer cloud · on-prem · edge · device</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-500">Register real execution targets and keep them eligible with signed heartbeats. Blackstar now fails closed when a portable target is missing, revoked, stale, degraded or belongs to another tenant.</p>
        </div>
      </div>
      <div className="rounded-xl border border-white/[.06] bg-white/[.025] px-4 py-3 text-right">
        <p className="text-[10px] uppercase tracking-[.16em] text-zinc-500">Active registrations</p>
        <p className="mt-1 text-xl font-semibold text-white">{session === 'yes' && inventory.data ? active : '—'}</p>
      </div>
    </div>

    {session === 'yes' && <div className="mt-5 rounded-2xl border border-sky-300/10 bg-sky-400/[.03] p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Target name" className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-sky-300/30" />
        <select value={deploymentTarget} onChange={(e) => setDeploymentTarget(e.target.value)} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-300/30">
          <option value="customer-cloud">Customer cloud</option>
          <option value="on-prem">On-prem</option>
          <option value="edge">Edge</option>
          <option value="device">Device</option>
        </select>
        <input value={region} onChange={(e) => setRegion(e.target.value)} maxLength={80} placeholder="Region (optional, e.g. uk)" className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-sky-300/30" />
        <select value={orgId} onChange={(e) => setOrgId(e.target.value)} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-300/30">
          <option value="">Personal workspace</option>
          {(inventory.data?.organisations ?? []).map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
        </select>
      </div>
      <button type="button" disabled={registration.isPending || !name.trim()} onClick={() => registration.mutate()} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-sky-300/20 bg-sky-400/[.08] px-3 py-2 text-xs font-medium text-sky-100 disabled:cursor-not-allowed disabled:opacity-40">
        <ShieldCheck className="h-3.5 w-3.5" />{registration.isPending ? 'Registering…' : 'Register runtime target'}
      </button>
      {registration.isError && <p className="mt-3 text-sm text-rose-300">{friendlyMessage(registration.error)}</p>}
      <SecretBox issued={issued} onClear={() => setIssued(null)} />
    </div>}

    {session === 'no' && <p className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-500">Sign in to manage portable runtime targets.</p>}
    {inventory.isError && <p className="mt-4 text-sm text-rose-300">{friendlyMessage(inventory.error)}</p>}
    {rotation.isError && <p className="mt-4 text-sm text-rose-300">{friendlyMessage(rotation.error)}</p>}
    {revocation.isError && <p className="mt-4 text-sm text-rose-300">{friendlyMessage(revocation.error)}</p>}

    {inventory.data?.targets?.length > 0 && <div className="mt-5 grid gap-3 lg:grid-cols-2">
      {inventory.data.targets.map((target) => {
        const state = targetState(target)
        return <div key={target.id} className="rounded-2xl border border-white/[.07] bg-black/25 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-sky-300" /><h3 className="text-sm font-semibold text-white">{target.name}</h3></div>
              <p className="mt-1 text-xs text-zinc-500">{target.deployment_target}{target.region ? ` · ${target.region}` : ''} · {target.org_id ? orgById.get(target.org_id) ?? 'Organisation' : 'Personal workspace'}</p>
            </div>
            <span className={`rounded-full border px-2 py-1 text-[11px] font-medium ${state.tone}`}>{state.label}</span>
          </div>
          <div className="mt-3 grid gap-2 text-xs text-zinc-500 sm:grid-cols-2">
            <p>Last heartbeat: <span className="text-zinc-300">{target.last_seen_at ? new Date(target.last_seen_at).toLocaleString() : 'Never'}</span></p>
            <p>Attestation expires: <span className="text-zinc-300">{target.expires_at ? new Date(target.expires_at).toLocaleString() : 'Not attested'}</span></p>
          </div>
          {!target.revoked_at && <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={rotation.isPending} onClick={() => rotation.mutate(target.id)} className="inline-flex items-center gap-2 rounded-lg border border-violet-300/15 bg-violet-400/[.06] px-3 py-2 text-xs font-medium text-violet-100 disabled:opacity-40"><RotateCcw className="h-3.5 w-3.5" />Rotate secret</button>
            <button type="button" disabled={revocation.isPending} onClick={() => revokeTarget && revocation.mutate(target.id)} className="inline-flex items-center gap-2 rounded-lg border border-rose-300/15 bg-rose-400/[.06] px-3 py-2 text-xs font-medium text-rose-100 disabled:opacity-40"><Ban className="h-3.5 w-3.5" />Revoke</button>
          </div>}
        </div>
      })}
    </div>}
  </section>
}
