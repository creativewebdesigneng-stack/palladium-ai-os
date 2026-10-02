import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { ExternalLink, Film, Loader2, ShieldCheck, Sparkles, TriangleAlert } from 'lucide-react'
import {
  createHuggingFaceCinemaPreview,
  getHuggingFaceCinemaExecutionOverview,
} from '@/lib/huggingface/huggingface-cinema.functions'
import { friendlyMessage } from '@/lib/errors'

export default function HuggingFaceCinemaExecutionPanel() {
  const overviewFn = useServerFn(getHuggingFaceCinemaExecutionOverview)
  const createFn = useServerFn(createHuggingFaceCinemaPreview)
  const qc = useQueryClient()
  const [prompt, setPrompt] = useState('')
  const [modelId, setModelId] = useState('')
  const [frames, setFrames] = useState(48)

  const overview = useQuery({
    queryKey: ['huggingface-cinema-execution'],
    queryFn: () => overviewFn(),
    retry: false,
    staleTime: 30_000,
  })
  const create = useMutation({
    mutationFn: () => createFn({ data: {
      prompt,
      ...(modelId.trim() ? { modelId: modelId.trim() } : {}),
      numFrames: Number(frames),
    }}),
    onSuccess: async () => {
      setPrompt('')
      await qc.invalidateQueries({ queryKey: ['huggingface-cinema-execution'] })
    },
  })

  const capabilities = overview.data?.capabilities
  const jobs = overview.data?.jobs ?? []
  const configured = capabilities?.configured === true

  return (
    <section className="mt-4 rounded-[24px] border border-sky-300/10 bg-gradient-to-br from-sky-400/[.04] via-black/35 to-violet-400/[.025] p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.2em] text-sky-200/65">
            <Film className="h-3.5 w-3.5" /> Optional execution lane
          </div>
          <h2 className="mt-2 text-sm font-semibold text-white">Hugging Face Cinema preview renderer</h2>
          <p className="mt-1 text-[11px] leading-5 text-zinc-500">
            Render a bounded short text-to-video preview through a private Hugging Face dedicated Inference Endpoint. Blackstar stores successful output privately and serves it through an owner-authorised signed URL. This does not replace Seedream, LTX or the Cinema master pipeline.
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[.12em] ${
          configured ? 'border-emerald-300/15 bg-emerald-400/[.05] text-emerald-200' : 'border-amber-300/15 bg-amber-400/[.05] text-amber-200'
        }`}>
          {configured ? <ShieldCheck className="h-3 w-3" /> : <TriangleAlert className="h-3 w-3" />}
          {configured ? 'Endpoint ready' : 'Endpoint not configured'}
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_140px_auto]">
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="A slow cinematic dolly through a rain-lit futuristic city at night…"
          className="min-h-24 rounded-xl border border-white/[.08] bg-black/30 px-3 py-2.5 text-xs text-white outline-none placeholder:text-zinc-700 focus:border-sky-300/20"
        />
        <input
          value={modelId}
          onChange={(event) => setModelId(event.target.value)}
          placeholder="Endpoint model label · optional"
          className="h-11 rounded-xl border border-white/[.08] bg-black/30 px-3 text-xs text-white outline-none placeholder:text-zinc-700 focus:border-sky-300/20"
        />
        <select
          value={frames}
          onChange={(event) => setFrames(Number(event.target.value))}
          className="h-11 rounded-xl border border-white/[.08] bg-black/30 px-3 text-xs text-white outline-none focus:border-sky-300/20"
        >
          {[24,48,72,96].map((value) => <option key={value} value={value}>{value} frames</option>)}
        </select>
        <button
          type="button"
          disabled={!configured || prompt.trim().length < 10 || create.isPending}
          onClick={() => create.mutate()}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-sky-300/15 bg-sky-400/[.07] px-4 text-xs font-medium text-sky-100 transition hover:bg-sky-400/[.11] disabled:opacity-35"
        >
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Render preview
        </button>
      </div>

      {!configured && capabilities?.note && (
        <p className="mt-3 text-[10px] leading-5 text-amber-200/60">{capabilities.note}</p>
      )}
      {create.error && <p className="mt-3 text-xs text-rose-300">{friendlyMessage(create.error)}</p>}

      <div className="mt-5 border-t border-white/[.05] pt-4">
        <p className="text-[9px] font-semibold uppercase tracking-[.18em] text-zinc-600">Recent Hugging Face previews</p>
        <div className="mt-2 grid gap-2 lg:grid-cols-2">
          {jobs.map((job) => (
            <article key={job.id} className="rounded-2xl border border-white/[.06] bg-black/20 p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="line-clamp-2 text-[11px] leading-5 text-zinc-300">{job.prompt}</p>
                  <p className="mt-1 text-[9px] text-zinc-700">{new Date(job.created_at).toLocaleString()}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-1 text-[8px] font-semibold uppercase tracking-[.12em] ${
                  job.status === 'completed' ? 'border-emerald-300/15 text-emerald-200' :
                  job.status === 'failed' ? 'border-rose-300/15 text-rose-200' :
                  'border-amber-300/15 text-amber-200'
                }`}>{job.status}</span>
              </div>
              {job.error_message && <p className="mt-2 text-[10px] leading-4 text-rose-300/80">{job.error_message}</p>}
              {job.output_url && (
                <a href={job.output_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-[10px] text-sky-200/75 hover:text-sky-100">
                  Open signed preview <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </article>
          ))}
          {!overview.isLoading && jobs.length === 0 && (
            <p className="rounded-2xl border border-dashed border-white/[.08] p-4 text-center text-[10px] text-zinc-700 lg:col-span-2">No Hugging Face Cinema previews yet.</p>
          )}
        </div>
      </div>
    </section>
  )
}
