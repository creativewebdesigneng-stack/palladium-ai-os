import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { CheckCircle2, Film, Loader2, RefreshCw, Scissors, TriangleAlert } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import MediaTimelinePanel from '@/components/media/MediaTimelinePanel';
import { useSessionReady } from '@/lib/useSessionReady';
import { friendlyMessage } from '@/lib/errors';
import { useToast } from '@/components/ui/use-toast';
import { Empty, Failed } from '@/components/business/live';
import { createMediaEditJob, getMediaStudioOverview, refreshMediaEditJob } from '@/lib/media/media-studio.functions';

export default function MediaStudio() {
  const session = useSessionReady();
  const qc = useQueryClient();
  const { toast } = useToast();
  const overviewFn = useServerFn(getMediaStudioOverview);
  const createFn = useServerFn(createMediaEditJob);
  const refreshFn = useServerFn(refreshMediaEditJob);
  const [inputName, setInputName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [mode, setMode] = useState('silence');
  const [threshold, setThreshold] = useState('0.04');
  const [marginBefore, setMarginBefore] = useState('100');
  const [marginAfter, setMarginAfter] = useState('100');
  const [outputFormat, setOutputFormat] = useState('mp4');

  const overview = useQuery({ queryKey: ['media-studio'], queryFn: () => overviewFn(), enabled: session === 'yes', retry: false });
  const refresh = () => qc.invalidateQueries({ queryKey: ['media-studio'] });
  const create = useMutation({
    mutationFn: () => createFn({ data: { inputName, sourceUrl, mode, threshold: Number(threshold), marginBeforeMs: Number(marginBefore), marginAfterMs: Number(marginAfter), outputFormat } }),
    onSuccess: async () => { setInputName(''); setSourceUrl(''); await refresh(); toast({ title: 'Media edit submitted' }); },
    onError: async (error) => { await refresh(); toast({ variant: 'destructive', title: 'Media edit could not start', description: friendlyMessage(error) }); },
  });
  const refreshJob = useMutation({ mutationFn: (id) => refreshFn({ data: { id } }), onSuccess: async () => { await refresh(); toast({ title: 'Media job refreshed' }); }, onError: (error) => toast({ variant: 'destructive', title: 'Could not refresh job', description: friendlyMessage(error) }) });
  const configured = overview.data?.capabilities?.autoEditor?.configured === true;
  const canSubmit = configured && inputName.trim() && sourceUrl.trim() && Number.isFinite(Number(threshold));
  const jobs = overview.data?.jobs ?? [];

  return <>
    <PageHeader eyebrow="AI Workforce" title="Media Studio" description="Automatic editing plus native synchronisation timelines. Jobs remain persisted and auditable; PalladiumAI never fabricates rendered media." />
    {session === 'no' && <Failed message="Sign in to use Media Studio." />}
    {overview.error && <Failed message={friendlyMessage(overview.error)} />}

    <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
      <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-violet-300"><Scissors className="h-4 w-4" /></span><div><h2 className="text-sm font-semibold text-white">New automatic edit</h2><p className="text-xs text-zinc-500">Remove dead space or cut around detected motion.</p></div></div>
        <div className={`mt-4 rounded-xl border p-3 text-xs ${configured ? 'border-emerald-400/20 bg-emerald-400/[.05] text-emerald-200' : 'border-amber-400/20 bg-amber-400/[.05] text-amber-200'}`}><div className="flex items-center gap-2">{configured ? <CheckCircle2 className="h-4 w-4" /> : <TriangleAlert className="h-4 w-4" />}<span>{configured ? 'Auto-Editor worker configured' : 'Auto-Editor worker not configured'}</span></div>{!configured && <p className="mt-1 text-[11px] text-amber-200/70">Set AUTO_EDITOR_WORKER_URL on the deployment before media jobs can run.</p>}</div>
        <div className="mt-4 space-y-3">
          <Field label="Input name"><input value={inputName} onChange={(event) => setInputName(event.target.value)} placeholder="Launch video.mp4" className={control} /></Field>
          <Field label="Source URL"><input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://…/video.mp4" className={control} /></Field>
          <div className="grid grid-cols-2 gap-2"><Field label="Edit method"><select value={mode} onChange={(event) => setMode(event.target.value)} className={control}><option value="silence">Silence</option><option value="motion">Motion</option></select></Field><Field label="Threshold"><input type="number" min="0" max="1" step="0.01" value={threshold} onChange={(event) => setThreshold(event.target.value)} className={control} /></Field></div>
          <div className="grid grid-cols-2 gap-2"><Field label="Before margin (ms)"><input type="number" min="0" value={marginBefore} onChange={(event) => setMarginBefore(event.target.value)} className={control} /></Field><Field label="After margin (ms)"><input type="number" min="0" value={marginAfter} onChange={(event) => setMarginAfter(event.target.value)} className={control} /></Field></div>
          <Field label="Export"><select value={outputFormat} onChange={(event) => setOutputFormat(event.target.value)} className={control}><option value="mp4">MP4</option><option value="mov">MOV</option><option value="premiere">Premiere</option><option value="resolve">DaVinci Resolve</option><option value="final-cut-pro">Final Cut Pro</option><option value="shotcut">Shotcut</option><option value="kdenlive">Kdenlive</option><option value="clip-sequence">Clip sequence</option></select></Field>
          <button disabled={!canSubmit || create.isPending} onClick={() => create.mutate()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40">{create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Start automatic edit</button>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold text-white">Media job history</h2><p className="mt-1 text-xs text-zinc-500">Real worker state and render outputs.</p></div>{overview.isFetching && <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />}</div>
        <div className="mt-4 space-y-3">{jobs.length === 0 ? <Empty icon={Film} title="No media jobs yet" desc="Submit an edit after your media worker is configured." /> : jobs.map((job) => <div key={job.id} className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-medium text-white">{job.input_name}</p><p className="mt-1 text-[11px] text-zinc-500">{job.mode} · threshold {job.threshold} · {job.output_format}</p></div><Status value={job.status} /></div><p className="mt-2 truncate text-[11px] text-zinc-600">{job.source_url}</p>{job.error_message && <p className="mt-2 text-xs text-rose-300">{job.error_message}</p>}<div className="mt-3 flex gap-2">{job.worker_job_id && !['completed','failed'].includes(job.status) && <button onClick={() => refreshJob.mutate(job.id)} disabled={refreshJob.isPending && refreshJob.variables === job.id} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300"><RefreshCw className="h-3.5 w-3.5" />Refresh</button>}{job.output_url && <a href={job.output_url} target="_blank" rel="noreferrer" className="rounded-lg border border-emerald-400/20 px-2.5 py-1.5 text-xs text-emerald-300">Open output</a>}</div></div>)}</div>
      </section>
    </div>

    <MediaTimelinePanel jobs={jobs} />
  </>;
}

const control = 'w-full rounded-xl border border-white/10 bg-[#11131a] px-3 py-2 text-xs text-white outline-none focus:border-violet-400/40';
function Field({ label, children }) { return <label className="block"><span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</span>{children}</label>; }
function Status({ value }) { const tone = value === 'completed' ? 'text-emerald-300 border-emerald-400/20' : value === 'failed' ? 'text-rose-300 border-rose-400/20' : 'text-amber-300 border-amber-400/20'; return <span className={`rounded-full border px-2 py-1 text-[10px] font-medium uppercase ${tone}`}>{value}</span>; }
