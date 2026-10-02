import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Crown, Loader2, LockKeyhole, Rocket, Sparkles, Target } from 'lucide-react'
import PageHeader from '@/components/palladium/PageHeader'
import { friendlyMessage } from '@/lib/errors'
import { getOutcomePackOverview, launchOutcomePack } from '@/lib/outcomes/outcome-packs.functions'

function PackCard({ pack, selected, onSelect, onOpen }) {
  return (
    <article className={`group relative overflow-hidden rounded-[22px] border p-4 transition ${
      selected ? 'border-violet-300/25 bg-violet-400/[.055]' : 'border-white/[.07] bg-black/25 hover:border-violet-300/15 hover:bg-white/[.025]'
    }`}>
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="flex items-start justify-between gap-3">
        <span className={`grid h-9 w-9 place-items-center rounded-xl border ${
          pack.tier === 'premium' ? 'border-amber-300/15 bg-amber-400/[.055] text-amber-200' : 'border-violet-300/12 bg-violet-400/[.05] text-violet-200'
        }`}>
          {pack.tier === 'premium' ? <Crown className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        </span>
        <span className={`rounded-full border px-2 py-1 text-[8px] font-semibold uppercase tracking-[.13em] ${
          pack.locked ? 'border-white/[.06] text-zinc-700' :
          pack.tier === 'premium' ? 'border-amber-300/15 text-amber-200/75' : 'border-violet-300/12 text-violet-200/70'
        }`}>
          {pack.locked ? 'Upgrade' : pack.tier === 'premium' ? 'Paid value' : 'Explorer'}
        </span>
      </div>
      <h3 className="mt-3 text-sm font-semibold tracking-[-.025em] text-white">{pack.name}</h3>
      <p className="mt-1 text-[11px] font-medium text-zinc-400">{pack.tagline}</p>
      <p className="mt-2 line-clamp-3 text-[10px] leading-5 text-zinc-600">{pack.description}</p>
      <div className="mt-3 rounded-xl border border-white/[.05] bg-black/20 px-3 py-2">
        <p className="text-[8px] font-semibold uppercase tracking-[.16em] text-zinc-700">Value</p>
        <p className="mt-1 text-[10px] leading-4 text-zinc-400">{pack.value}</p>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onSelect(pack)}
          className="flex-1 rounded-xl border border-violet-300/12 bg-violet-400/[.055] px-3 py-2 text-[10px] font-medium text-violet-100 hover:bg-violet-400/[.09]"
        >
          {pack.locked ? 'View pack' : 'Prepare mission'}
        </button>
        <button
          type="button"
          onClick={() => onOpen(pack.launchRoute)}
          className="grid h-9 w-9 place-items-center rounded-xl border border-white/[.07] text-zinc-600 transition hover:bg-white/[.035] hover:text-white"
          title="Open specialist workspace"
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  )
}

export default function OutcomePacks() {
  const navigate = useNavigate()
  const overviewFn = useServerFn(getOutcomePackOverview)
  const launchFn = useServerFn(launchOutcomePack)
  const [tab, setTab] = useState('acquisition')
  const [selected, setSelected] = useState(null)
  const [context, setContext] = useState('')

  const overview = useQuery({
    queryKey: ['outcome-packs'],
    queryFn: () => overviewFn(),
    retry: false,
    staleTime: 60_000,
  })
  const launch = useMutation({
    mutationFn: () => launchFn({ data: { packId: selected.id, context } }),
    onSuccess: (result) => navigate(result.missionControlRoute),
  })

  const packs = useMemo(
    () => (overview.data?.packs ?? []).filter((pack) => pack.tier === tab),
    [overview.data?.packs, tab],
  )
  const plan = overview.data?.plan

  return (
    <div>
      <PageHeader
        eyebrow="Blackstar Outcomes"
        title="Outcome Packs"
        description="Forty practical starting points that turn Blackstar's existing intelligence, agents, workflows and specialist studios into governed jobs users can launch immediately."
        action={
          <div className="rounded-xl border border-white/[.07] bg-black/25 px-3 py-2 text-right">
            <p className="text-[8px] font-semibold uppercase tracking-[.16em] text-zinc-700">Current plan</p>
            <p className="mt-0.5 text-xs font-medium text-white">{plan?.name ?? 'Loading…'}</p>
          </div>
        }
      />

      <section className="mb-5 grid gap-3 md:grid-cols-3">
        {[
          ['40', 'Outcome Packs', Target],
          ['20', 'Explorer acquisition packs', Sparkles],
          ['20', 'Paid-value packs', Crown],
        ].map(([value,label,Icon]) => (
          <div key={label} className="blackstar-metric-card relative overflow-hidden rounded-[20px] border border-white/[.07] p-4">
            <Icon className="h-4 w-4 text-violet-300" />
            <p className="mt-4 text-2xl font-semibold tracking-[-.05em] text-white">{value}</p>
            <p className="mt-1 text-[10px] text-zinc-600">{label}</p>
          </div>
        ))}
      </section>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button onClick={() => setTab('acquisition')} className={`rounded-xl border px-3 py-2 text-xs transition ${tab === 'acquisition' ? 'border-violet-300/20 bg-violet-400/[.07] text-violet-100' : 'border-white/[.07] text-zinc-500'}`}>
          Explorer · come to Blackstar
        </button>
        <button onClick={() => setTab('premium')} className={`rounded-xl border px-3 py-2 text-xs transition ${tab === 'premium' ? 'border-amber-300/20 bg-amber-400/[.06] text-amber-100' : 'border-white/[.07] text-zinc-500'}`}>
          Paid value · stay with Blackstar
        </button>
        <p className="ml-auto text-[10px] text-zinc-700">Launches create normal governed Mission Control tasks.</p>
      </div>

      {overview.isLoading ? (
        <div className="grid min-h-60 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-violet-300" /></div>
      ) : overview.error ? (
        <p className="rounded-2xl border border-rose-300/15 bg-rose-400/[.04] p-4 text-sm text-rose-200">{friendlyMessage(overview.error)}</p>
      ) : (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {packs.map((pack) => (
            <PackCard key={pack.id} pack={pack} selected={selected?.id === pack.id} onSelect={(value) => { setSelected(value); setContext('') }} onOpen={navigate} />
          ))}
        </section>
      )}

      {selected && (
        <section className="sticky bottom-4 z-20 mt-5 overflow-hidden rounded-[24px] border border-violet-300/15 bg-[#07070c]/95 p-5 shadow-[0_28px_90px_rgba(0,0,0,.55)] backdrop-blur-2xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {selected.locked ? <LockKeyhole className="h-4 w-4 text-amber-300" /> : <Rocket className="h-4 w-4 text-violet-300" />}
                <p className="text-sm font-semibold text-white">{selected.name}</p>
              </div>
              <p className="mt-1 text-[10px] leading-5 text-zinc-600">{selected.description}</p>
              <textarea
                value={context}
                onChange={(event) => setContext(event.target.value)}
                maxLength={4000}
                placeholder="Optional: add your goal, business, audience, files/context to use, constraints, deadline or other details…"
                className="mt-3 min-h-20 w-full rounded-xl border border-white/[.07] bg-black/30 px-3 py-2.5 text-xs text-white outline-none placeholder:text-zinc-700 focus:border-violet-300/20"
              />
            </div>
            <div className="flex shrink-0 flex-col gap-2 lg:w-48">
              {selected.locked ? (
                <button onClick={() => navigate('/billing')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300/15 bg-amber-400/[.07] px-4 py-3 text-xs font-medium text-amber-100">
                  <Crown className="h-4 w-4" /> View paid plans
                </button>
              ) : (
                <button
                  disabled={launch.isPending}
                  onClick={() => launch.mutate()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-300/15 bg-violet-500/[.10] px-4 py-3 text-xs font-medium text-violet-100 hover:bg-violet-500/[.15] disabled:opacity-40"
                >
                  {launch.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Launch mission
                </button>
              )}
              <button onClick={() => navigate(selected.launchRoute)} className="rounded-xl border border-white/[.07] px-4 py-3 text-xs text-zinc-400 hover:bg-white/[.03] hover:text-white">
                Open workspace
              </button>
              <button onClick={() => setSelected(null)} className="text-[10px] text-zinc-700 hover:text-zinc-400">Close</button>
            </div>
          </div>
          {launch.error && <p className="mt-3 text-xs text-rose-300">{friendlyMessage(launch.error)}</p>}
        </section>
      )}
    </div>
  )
}
