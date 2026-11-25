import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { Activity, Cpu, Play, ShieldCheck } from 'lucide-react'
import { Failed } from '@/components/business/live'
import { friendlyMessage } from '@/lib/errors'
import { getAstraXStatus, runAstraXTask } from '@/lib/ai/astra-x.functions'

const STATE_LABELS = {
  disabled: 'Disabled by feature flag',
  needs_configuration: 'Needs runtime configuration',
  invalid_configuration: 'Configuration rejected',
  configured_unverified: 'Configured · reachability not yet verified',
}

export default function AstraXConsole() {
  const getStatus = useServerFn(getAstraXStatus)
  const runTask = useServerFn(runAstraXTask)
  const [prompt, setPrompt] = useState('')
  const status = useQuery({
    queryKey: ['astra-x-runtime-status'],
    queryFn: () => getStatus(),
    retry: false,
    refetchInterval: 30_000,
  })
  const execution = useMutation({
    mutationFn: () => runTask({
      data: {
        messages: [{ role: 'user', content: prompt.trim() }],
        maxTokens: 512,
        timeoutMs: 45_000,
      },
    }),
  })

  const state = status.data?.state ?? 'needs_configuration'
  const enabled = state === 'configured_unverified'

  // Keep this unverified capability out of the normal AI Hub surface unless
  // an operator explicitly enables it on the server.
  if (status.isLoading || (status.isSuccess && state === 'disabled')) return null

  return (
    <section className="relative overflow-hidden rounded-[26px] border border-violet-300/15 bg-[linear-gradient(145deg,rgba(18,12,30,.82),rgba(5,5,10,.94))] p-5 shadow-[0_24px_80px_rgba(0,0,0,.22)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/30 to-transparent" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-300/20 bg-violet-400/[.08]">
            <Cpu className="h-5 w-5 text-violet-200" />
          </div>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[.24em] text-violet-300/70">Blackstar independent intelligence</p>
            <h2 className="mt-1 text-lg font-semibold text-white">Astra X</h2>
            <p className="mt-1 max-w-2xl text-sm leading-5 text-zinc-400">Text-only local-first inference through Blackstar's existing pinned model gateway. Tools and cross-provider fallback are disabled on this path.</p>
          </div>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${enabled ? 'border-amber-300/25 bg-amber-300/[.07] text-amber-100' : 'border-white/10 bg-white/[.03] text-zinc-400'}`}>
          {STATE_LABELS[state] ?? 'Status unavailable'}
        </span>
      </div>

      {status.isError && <div className="mt-4"><Failed message={friendlyMessage(status.error)} onRetry={() => status.refetch()} /></div>}

      {status.isSuccess && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-white/[.07] bg-black/25 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[.14em] text-zinc-500">Selected model</p>
            <p className="mt-1 truncate text-xs font-medium text-zinc-200">{status.data.model ?? 'Not configured'}</p>
          </div>
          <div className="rounded-xl border border-white/[.07] bg-black/25 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[.14em] text-zinc-500">Execution policy</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-zinc-200"><ShieldCheck className="h-3.5 w-3.5 text-emerald-300" /> Pinned provider · no tools · no fallback</p>
          </div>
        </div>
      )}

      {enabled && (
        <div className="mt-4">
          <label htmlFor="astra-x-prompt" className="text-xs font-semibold uppercase tracking-[.14em] text-violet-100">Test Astra X</label>
          <textarea
            id="astra-x-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            maxLength={24_000}
            rows={3}
            placeholder="Ask Astra X to reason through a task or explain a technical problem…"
            className="mt-2 w-full resize-y rounded-xl border border-violet-300/15 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-300/35"
          />
          <button
            type="button"
            disabled={execution.isPending || !prompt.trim()}
            onClick={() => execution.mutate()}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-violet-200/25 bg-violet-300 px-3.5 py-2 text-xs font-semibold text-[#0b0811] transition hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {execution.isPending ? <Activity className="h-3.5 w-3.5 animate-pulse" /> : <Play className="h-3.5 w-3.5" />}
            {execution.isPending ? 'Running pinned model…' : 'Run test prompt'}
          </button>
          {execution.isError && <div className="mt-3"><Failed message={friendlyMessage(execution.error)} onRetry={() => execution.mutate()} /></div>}
          {execution.isSuccess && (
            <div className="mt-4 rounded-xl border border-emerald-300/15 bg-emerald-300/[.045] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-emerald-100">Response received</p>
                <span className="text-[10px] text-zinc-500">{execution.data?.provider} · {execution.data?.model}</span>
              </div>
              <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm leading-6 text-zinc-200">{execution.data?.text}</pre>
              {execution.data?.usage && <p className="mt-3 text-[10px] text-zinc-500">Tokens: {execution.data.usage.input} input · {execution.data.usage.output} output</p>}
            </div>
          )}
        </div>
      )}

      {status.isSuccess && !enabled && (
        <p className="mt-4 text-xs leading-5 text-zinc-500">
          Astra X remains unavailable until the deployment feature flag and native provider configuration are set. Configuration status is not a live health check.
        </p>
      )}
    </section>
  )
}
