import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Clapperboard, Loader2, RefreshCw, Sparkles, TriangleAlert, WandSparkles } from 'lucide-react';
import { friendlyMessage } from '@/lib/errors';
import { useToast } from '@/components/ui/use-toast';
import {
  createShortVideoJob,
  getShortVideoOverview,
  planShortVideoScript,
  refreshShortVideoJob,
} from '@/lib/media/short-video.functions';

export default function ShortVideoAutomationPanel({ enabled }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const overviewFn = useServerFn(getShortVideoOverview);
  const planFn = useServerFn(planShortVideoScript);
  const createFn = useServerFn(createShortVideoJob);
  const refreshFn = useServerFn(refreshShortVideoJob);
  const [topic, setTopic] = useState('');
  const [script, setScript] = useState('');
  const [style, setStyle] = useState('fast-paced, polished social video');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [durationSeconds, setDurationSeconds] = useState(45);
  const [materialSource, setMaterialSource] = useState('stock');
  const [sourceUrls, setSourceUrls] = useState('');
  const [voice, setVoice] = useState('alloy');
  const [subtitles, setSubtitles] = useState(true);
  const [subtitleMode, setSubtitleMode] = useState('sentence');
  const [backgroundMusic, setBackgroundMusic] = useState(true);
  const [transition, setTransition] = useState('fade');

  const overview = useQuery({
    queryKey: ['short-video-automation'],
    queryFn: () => overviewFn({ data: {} }),
    enabled,
    retry: false,
    refetchInterval: 30_000,
  });
  const capability = overview.data?.capability;
  const jobs = overview.data?.jobs ?? [];

  const plan = useMutation({
    mutationFn: () => planFn({ data: { topic: topic.trim(), durationSeconds: Number(durationSeconds), style: style.trim() } }),
    onSuccess: (result) => {
      setScript(result.script);
      toast({ title: 'Short-video script planned', description: `${result.provider} · ${result.model}` });
    },
    onError: (error) => toast({ variant: 'destructive', title: 'Script planning failed', description: friendlyMessage(error) }),
  });

  const create = useMutation({
    mutationFn: () => createFn({
      data: {
        script: script.trim(),
        aspectRatio,
        durationSeconds: Number(durationSeconds),
        materialSource,
        sourceUrls: sourceUrls.split(/\r?\n/).map((v) => v.trim()).filter(Boolean),
        voice: voice.trim(),
        subtitles,
        subtitleMode,
        backgroundMusic,
        transition,
      },
    }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['short-video-automation'] });
      toast({ title: 'Automated short video submitted' });
    },
    onError: (error) => toast({ variant: 'destructive', title: 'Short-video render could not start', description: friendlyMessage(error) }),
  });

  const refresh = useMutation({
    mutationFn: (id) => refreshFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['short-video-automation'] }),
    onError: (error) => toast({ variant: 'destructive', title: 'Could not refresh short-video job', description: friendlyMessage(error) }),
  });

  const canPlan = topic.trim().length >= 3;
  const canRender = Boolean(capability?.configured && script.trim().length >= 10 && (materialSource !== 'provided' || sourceUrls.trim()));

  return (
    <section className="mt-5 rounded-2xl border border-white/10 bg-white/[.03] p-5">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
        <div>
          <div className="flex items-center gap-2"><Clapperboard className="h-4 w-4 text-cyan-300" /><h2 className="text-sm font-semibold text-white">Automated short videos</h2></div>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-zinc-500">A native PalladiumAI pipeline inspired by the useful MoneyPrinterTurbo workflow: plan the script with the existing model gateway, then assemble media, narration, subtitles, music and transitions through a dedicated render worker. Publishing remains in Social Operations.</p>
        </div>
        <div className={`rounded-full border px-2.5 py-1 text-[10px] ${capability?.configured ? 'border-emerald-400/20 text-emerald-300' : 'border-white/10 text-zinc-500'}`}>{capability?.configured ? 'Worker ready' : 'Worker not configured'}</div>
      </div>

      {overview.error && <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/[.05] p-3 text-xs text-rose-200">{friendlyMessage(overview.error)}</div>}
      {!capability?.configured && <div className="mt-4 flex gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[.04] p-3 text-xs text-amber-100"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /><span>Set SHORT_VIDEO_WORKER_URL to enable real rendering. PalladiumAI will not simulate a completed video when the worker is unavailable.</span></div>}

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-2"><WandSparkles className="h-4 w-4 text-violet-300" /><h3 className="text-xs font-semibold text-white">1. Plan</h3></div>
          <label className="block"><span className="sv-label">Topic or brief</span><textarea rows={4} value={topic} onChange={(e) => setTopic(e.target.value)} className="sv-input resize-y py-2.5" placeholder="What should the short video explain, sell or tell?" /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label><span className="sv-label">Target duration</span><select value={durationSeconds} onChange={(e) => setDurationSeconds(Number(e.target.value))} className="sv-input h-10">{(capability?.durationSeconds ?? [15,30,45,60,90,120,180]).map((v) => <option key={v} value={v}>{v}s</option>)}</select></label>
            <label><span className="sv-label">Style</span><input value={style} onChange={(e) => setStyle(e.target.value)} className="sv-input h-10" /></label>
          </div>
          <button type="button" disabled={!canPlan || plan.isPending} onClick={() => plan.mutate()} className="inline-flex items-center gap-2 rounded-xl border border-violet-400/25 bg-violet-400/10 px-3 py-2 text-xs text-violet-100 disabled:opacity-40">{plan.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}Generate script with PalladiumAI</button>
          <label className="block"><span className="sv-label">Narration script</span><textarea rows={11} maxLength={20000} value={script} onChange={(e) => setScript(e.target.value)} className="sv-input resize-y py-2.5" placeholder="Generate a script above or paste your own." /></label>
        </div>

        <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-2"><Clapperboard className="h-4 w-4 text-cyan-300" /><h3 className="text-xs font-semibold text-white">2. Assemble & render</h3></div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label><span className="sv-label">Format</span><select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="sv-input h-10">{(capability?.aspectRatios ?? ['9:16','16:9','1:1']).map((v) => <option key={v}>{v}</option>)}</select></label>
            <label><span className="sv-label">Media source</span><select value={materialSource} onChange={(e) => setMaterialSource(e.target.value)} className="sv-input h-10"><option value="stock">Stock media</option><option value="generated">AI generated</option><option value="provided">Provided URLs</option></select></label>
            <label><span className="sv-label">Transition</span><select value={transition} onChange={(e) => setTransition(e.target.value)} className="sv-input h-10"><option value="none">None</option><option value="fade">Fade</option><option value="slide">Slide</option></select></label>
          </div>
          {materialSource === 'provided' && <label className="block"><span className="sv-label">Public media URLs · one per line</span><textarea rows={4} value={sourceUrls} onChange={(e) => setSourceUrls(e.target.value)} className="sv-input resize-y py-2.5" placeholder="https://…" /></label>}
          <div className="grid gap-3 sm:grid-cols-2">
            <label><span className="sv-label">Narration voice</span><input value={voice} onChange={(e) => setVoice(e.target.value)} className="sv-input h-10" placeholder="alloy" /></label>
            <label><span className="sv-label">Subtitle timing</span><select value={subtitleMode} onChange={(e) => setSubtitleMode(e.target.value)} disabled={!subtitles} className="sv-input h-10 disabled:opacity-40"><option value="sentence">Sentence</option><option value="word">Word</option></select></label>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Toggle checked={subtitles} onChange={setSubtitles} label="Burn subtitles" />
            <Toggle checked={backgroundMusic} onChange={setBackgroundMusic} label="Background music" />
          </div>
          <button type="button" disabled={!canRender || create.isPending} onClick={() => create.mutate()} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40">{create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Render short video</button>
          <p className="text-[10px] leading-4 text-zinc-600">Stock retrieval, generated visual assembly, narration, subtitle alignment, soundtrack mixing and final composition belong to the render worker. Provider/API secrets stay server-side.</p>
        </div>
      </div>

      <div className="mt-5 border-t border-white/10 pt-4">
        <div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-semibold text-white">Short-video jobs</h3>{overview.isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />}</div>
        <div className="space-y-2">
          {jobs.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-zinc-600">No automated short-video jobs yet.</p>}
          {jobs.map((job) => <div key={job.id} className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><div className="flex items-center gap-2"><span className="text-xs font-medium text-white">Automated short video</span><Status value={job.status} /></div><p className="mt-1 line-clamp-2 text-[11px] leading-4 text-zinc-500">{job.prompt}</p><p className="mt-1 text-[10px] text-zinc-600">{job.aspect_ratio} · {job.duration_seconds}s · {job.metadata?.materialSource ?? 'media'}</p></div><div className="flex gap-2">{job.worker_job_id && !['completed','failed'].includes(job.status) && <button onClick={() => refresh.mutate(job.id)} disabled={refresh.isPending} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-zinc-300"><RefreshCw className="h-3 w-3" />Refresh</button>}{job.output_url && <a href={job.output_url} target="_blank" rel="noreferrer" className="rounded-lg border border-emerald-400/20 px-2 py-1 text-[10px] text-emerald-300">Open output</a>}</div></div>{job.error_message && <p className="mt-2 text-[11px] text-rose-300">{job.error_message}</p>}{job.metadata?.stage && <p className="mt-2 text-[10px] text-cyan-300">Stage: {job.metadata.stage}{typeof job.metadata.progress === 'number' ? ` · ${Math.round(job.metadata.progress)}%` : ''}</p>}</div>)}
        </div>
      </div>
      <style>{`.sv-label{margin-bottom:.375rem;display:block;font-size:.625rem;font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:rgb(113 113 122)}.sv-input{width:100%;border-radius:.75rem;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.3);padding-left:.75rem;padding-right:.75rem;font-size:.75rem;color:white;outline:none}.sv-input:focus{border-color:rgba(34,211,238,.35)}.sv-input::placeholder{color:rgb(82 82 91)}`}</style>
    </section>
  );
}

function Toggle({ checked, onChange, label }) { return <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-cyan-500" />{label}</label>; }
function Status({ value }) { const tone = value === 'completed' ? 'text-emerald-300' : value === 'failed' ? 'text-rose-300' : 'text-amber-300'; return <span className={`text-[10px] uppercase ${tone}`}>{value}</span>; }
