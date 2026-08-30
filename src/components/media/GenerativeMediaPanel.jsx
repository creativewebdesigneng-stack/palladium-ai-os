import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Film, ImageIcon, Loader2, RefreshCw, Sparkles, TriangleAlert } from 'lucide-react';
import { friendlyMessage } from '@/lib/errors';
import { useToast } from '@/components/ui/use-toast';
import {
  createGenerativeMediaJob,
  getGenerativeMediaOverview,
  refreshGenerativeMediaJob,
} from '@/lib/media/generative-media.functions';

export default function GenerativeMediaPanel({ enabled }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const overviewFn = useServerFn(getGenerativeMediaOverview);
  const createFn = useServerFn(createGenerativeMediaJob);
  const refreshFn = useServerFn(refreshGenerativeMediaJob);
  const [provider, setProvider] = useState('seedream');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [sourceUrl, setSourceUrl] = useState('');
  const [durationSeconds, setDurationSeconds] = useState(5);

  const overview = useQuery({
    queryKey: ['generative-media'],
    queryFn: () => overviewFn({ data: {} }),
    enabled,
    retry: false,
    refetchInterval: 30_000,
  });
  const capabilities = overview.data?.capabilities ?? {};
  const capability = capabilities[provider];
  const jobs = overview.data?.jobs ?? [];

  const create = useMutation({
    mutationFn: () => createFn({
      data: {
        provider,
        prompt: prompt.trim(),
        aspectRatio,
        sourceUrl: sourceUrl.trim() || null,
        durationSeconds: provider === 'ltx' ? Number(durationSeconds) : null,
      },
    }),
    onSuccess: async () => {
      setPrompt('');
      setSourceUrl('');
      await qc.invalidateQueries({ queryKey: ['generative-media'] });
      toast({ title: provider === 'seedream' ? 'Image generation submitted' : 'Video generation submitted' });
    },
    onError: (error) => toast({ variant: 'destructive', title: 'Generation could not start', description: friendlyMessage(error) }),
  });

  const refresh = useMutation({
    mutationFn: (id) => refreshFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['generative-media'] }),
    onError: (error) => toast({ variant: 'destructive', title: 'Could not refresh generation', description: friendlyMessage(error) }),
  });

  const ratios = capability?.aspectRatios ?? (provider === 'seedream' ? ['1:1', '4:5', '3:4', '16:9', '9:16', '21:9'] : ['16:9', '9:16', '1:1']);
  const canSubmit = Boolean(capability?.configured && prompt.trim());

  return (
    <section className="mt-5 rounded-2xl border border-white/10 bg-white/[.03] p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-fuchsia-300" /><h2 className="text-sm font-semibold text-white">Generative media</h2></div>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-zinc-500">Seedream image workflows and LTX synchronized audio/video generation live inside Media Studio. Heavy model runtimes stay on separately deployed workers; PalladiumAI owns authentication, job history, prompts and audit state.</p>
        </div>
        <div className="flex gap-2">
          <ProviderButton active={provider === 'seedream'} onClick={() => { setProvider('seedream'); setAspectRatio('16:9'); }} icon={ImageIcon} label="Seedream" ready={capabilities.seedream?.configured} />
          <ProviderButton active={provider === 'ltx'} onClick={() => { setProvider('ltx'); setAspectRatio('16:9'); }} icon={Film} label="LTX" ready={capabilities.ltx?.configured} />
        </div>
      </div>

      {overview.error && <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/[.05] p-3 text-xs text-rose-200">{friendlyMessage(overview.error)}</div>}
      {!capability?.configured && <div className="mt-4 flex gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[.04] p-3 text-xs text-amber-100"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /><span>{provider === 'seedream' ? 'Set SEEDREAM_WORKER_URL to enable image generation.' : 'Set LTX_WORKER_URL to enable LTX video generation.'}</span></div>}

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          <label className="block"><span className="label">Prompt</span><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={8} maxLength={12000} placeholder={provider === 'seedream' ? 'Describe the image or edit. Seedream production prompt collections are available in Prompt Workspace.' : 'Describe the shot, action, camera, environment, dialogue/sound and timing.'} className="input resize-y py-2.5" /></label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label><span className="label">Aspect ratio</span><select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="input h-10">{ratios.map((ratio) => <option key={ratio} value={ratio}>{ratio}</option>)}</select></label>
            {provider === 'ltx' && <label><span className="label">Duration</span><select value={durationSeconds} onChange={(e) => setDurationSeconds(Number(e.target.value))} className="input h-10">{(capabilities.ltx?.durationSeconds ?? [3,5,8,10]).map((seconds) => <option key={seconds} value={seconds}>{seconds}s</option>)}</select></label>}
            <label className={provider === 'seedream' ? 'sm:col-span-2' : ''}><span className="label">Source image URL · optional</span><input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} className="input h-10" placeholder="https://…" /></label>
          </div>
          <button type="button" disabled={!canSubmit || create.isPending} onClick={() => create.mutate()} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40">{create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}{provider === 'seedream' ? 'Generate image' : 'Generate video'}</button>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-semibold text-white">Worker capabilities</p>
          <div className="mt-3 space-y-2 text-[11px] text-zinc-400">
            {(capability?.workflows ?? []).map((workflow) => <div key={workflow} className="rounded-lg border border-white/10 px-2.5 py-2">{workflow}</div>)}
          </div>
          <p className="mt-3 text-[10px] leading-4 text-zinc-600">{capability?.note}</p>
        </div>
      </div>

      <div className="mt-5 border-t border-white/10 pt-4">
        <div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-semibold text-white">Generation history</h3>{overview.isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />}</div>
        <div className="space-y-2">
          {jobs.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-zinc-600">No generative media jobs yet.</p>}
          {jobs.map((job) => <div key={job.id} className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><div className="flex items-center gap-2"><span className="text-xs font-medium text-white">{job.provider === 'seedream' ? 'Seedream image' : 'LTX video'}</span><Status value={job.status} /></div><p className="mt-1 line-clamp-2 text-[11px] leading-4 text-zinc-500">{job.prompt}</p><p className="mt-1 text-[10px] text-zinc-600">{job.aspect_ratio}{job.duration_seconds ? ` · ${job.duration_seconds}s` : ''}</p></div><div className="flex gap-2">{job.worker_job_id && !['completed','failed'].includes(job.status) && <button onClick={() => refresh.mutate(job.id)} disabled={refresh.isPending} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-zinc-300"><RefreshCw className="h-3 w-3" />Refresh</button>}{job.output_url && <a href={job.output_url} target="_blank" rel="noreferrer" className="rounded-lg border border-emerald-400/20 px-2 py-1 text-[10px] text-emerald-300">Open output</a>}</div></div>{job.error_message && <p className="mt-2 text-[11px] text-rose-300">{job.error_message}</p>}</div>)}
        </div>
      </div>
      <style>{`.label{margin-bottom:.375rem;display:block;font-size:.625rem;font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:rgb(113 113 122)}.input{width:100%;border-radius:.75rem;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.3);padding-left:.75rem;padding-right:.75rem;font-size:.75rem;color:white;outline:none}.input:focus{border-color:rgba(217,70,239,.4)}.input::placeholder{color:rgb(82 82 91)}`}</style>
    </section>
  );
}

function ProviderButton({ active, onClick, icon: Icon, label, ready }) { return <button type="button" onClick={onClick} className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs ${active ? 'border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-100' : 'border-white/10 text-zinc-400'}`}><Icon className="h-3.5 w-3.5" />{label}<span className={`h-1.5 w-1.5 rounded-full ${ready ? 'bg-emerald-400' : 'bg-zinc-600'}`} /></button>; }
function Status({ value }) { const tone = value === 'completed' ? 'text-emerald-300' : value === 'failed' ? 'text-rose-300' : 'text-amber-300'; return <span className={`text-[10px] uppercase ${tone}`}>{value}</span>; }
