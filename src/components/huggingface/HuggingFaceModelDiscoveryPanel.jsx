import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { Box, ExternalLink, Film, Loader2, RefreshCw, ShieldCheck } from 'lucide-react'
import { discoverStudioHuggingFaceModels } from '@/lib/huggingface/huggingface-studio.functions'
import { friendlyMessage } from '@/lib/errors'

const TASK_COPY = {
  'text-to-video': ['Text → video', Film],
  'image-to-video': ['Image → video', Film],
  'text-to-3d': ['Text → 3D', Box],
  'image-to-3d': ['Image → 3D', Box],
}

export default function HuggingFaceModelDiscoveryPanel({
  tasks = ['text-to-video','image-to-video'],
  title = 'Hugging Face model intelligence',
  description = 'Discover relevant Hub models and whether Hugging Face currently advertises a live inference provider.',
}) {
  const discoverFn = useServerFn(discoverStudioHuggingFaceModels)
  const [task, setTask] = useState(tasks[0])
  const query = useQuery({
    queryKey: ['huggingface-studio-models', task],
    queryFn: () => discoverFn({ data: { task, limit: 12 } }),
    retry: 1,
    staleTime: 5 * 60 * 1000,
  })
  const models = query.data?.models ?? []

  return (
    <section className="rounded-[24px] border border-amber-300/10 bg-gradient-to-br from-amber-300/[.035] via-black/35 to-violet-400/[.025] p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.2em] text-amber-200/65">
            <ShieldCheck className="h-3.5 w-3.5" /> Provider discovery
          </div>
          <h2 className="mt-2 text-sm font-semibold text-white">{title}</h2>
          <p className="mt-1 max-w-3xl text-[11px] leading-5 text-zinc-500">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-2 text-[10px] text-zinc-400 hover:text-white disabled:opacity-40"
        >
          {query.isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh Hub
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {tasks.map((id) => {
          const [label, Icon] = TASK_COPY[id] ?? [id, Box]
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTask(id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] transition ${task === id ? 'border-amber-300/25 bg-amber-300/[.08] text-amber-100' : 'border-white/8 text-zinc-500 hover:text-zinc-200'}`}
            >
              <Icon className="h-3 w-3" />{label}
            </button>
          )
        })}
      </div>

      {query.isLoading && <p className="mt-4 text-xs text-zinc-500">Checking Hugging Face Hub…</p>}
      {query.isError && <p className="mt-4 text-xs text-rose-300">{friendlyMessage(query.error)}</p>}

      {!query.isLoading && !query.isError && (
        <>
          <div className="mt-4 flex flex-wrap gap-2 text-[9px] uppercase tracking-[.12em] text-zinc-600">
            <span>{models.length} model{models.length === 1 ? '' : 's'} found</span>
            <span>·</span>
            <span>{models.filter((model) => model.inferenceReady).length} with live inference provider metadata</span>
            <span>·</span>
            <span>{query.data?.tokenConfigured ? 'HF token configured' : 'public discovery'}</span>
          </div>
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {models.map((model) => (
              <article key={model.id} className="rounded-2xl border border-white/[.065] bg-black/25 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-white">{model.id}</p>
                    <p className="mt-1 text-[9px] text-zinc-600">{model.downloads.toLocaleString()} downloads · {model.likes.toLocaleString()} likes</p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2 py-1 text-[8px] font-semibold uppercase tracking-[.12em] ${model.inferenceReady ? 'border-emerald-300/15 bg-emerald-400/[.05] text-emerald-200' : 'border-white/[.06] text-zinc-600'}`}>
                    {model.inferenceReady ? 'Provider advertised' : 'Discovery only'}
                  </span>
                </div>
                {model.inferenceProviders.length > 0 && (
                  <p className="mt-2 truncate text-[9px] text-zinc-600">Providers: {model.inferenceProviders.join(' · ')}</p>
                )}
                <a href={model.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-[10px] text-amber-200/65 hover:text-amber-100">
                  Open model card <ExternalLink className="h-3 w-3" />
                </a>
              </article>
            ))}
            {models.length === 0 && (
              <p className="rounded-2xl border border-dashed border-white/10 p-5 text-center text-xs text-zinc-600 lg:col-span-2">No Hub models were returned for this task.</p>
            )}
          </div>
        </>
      )}

      <p className="mt-4 border-t border-white/[.05] pt-3 text-[9px] leading-4 text-zinc-700">
        Discovery is informational. Blackstar does not mark a model executable merely because it exists on the Hub; actual studio execution continues through verified provider endpoints and workers.
      </p>
    </section>
  )
}
