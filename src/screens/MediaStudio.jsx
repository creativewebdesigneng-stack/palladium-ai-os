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
    onSuccess: async () => { setInputName(''); setSourceUrl(''); await refresh(); toast({ title: 'Media operation submitted' }); },
    onError: async (error) => { await refresh(); toast({ variant: 'destructive', title: 'Media operation could not start', description: friendlyMessage(error) }); },
  });
  const refreshJob = useMutation({ mutationFn: (id) => refreshFn({ data: { id } }), onSuccess: async () => { await refresh(); toast({ title: 'Media operation refreshed' }); }, onError: (error) => toast({ variant: 'destructive', title: 'Could not refresh operation', description: friendlyMessage(error) }) });
  const configured = overview.data?.capabilities?.autoEditor?.configured === true;
  const canSubmit = configured && inputName.trim() && sourceUrl.trim() && Number.isFinite(Number(threshold));
  const jobs = overview.data?.jobs ?? [];

  return <>
    <PageHeader eyebrow="Media Intelligence" title="Media Operations" description="Automated editing and synchronisation infrastructure with persisted, auditable worker state. Blackstar reports real render status and never fabricates completed media." />
    {session === 'no' && <Failed message="Sign in to use Media Operations." />}
    {overview.error && <Failed message={friendlyMessage(overview.error)} />}

    <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
      <section className="relative overflow-hidden rounded-[24px] border border-white/10 bg-black/40 p-5 shadow-[0_24px_70px_rgba(0,0,0,.28)] backdrop-blur-xl">
        <div aria-hidden className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/35 to-transparent" />
        <div className="relative flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl border border-violet-300/15 bg-violet-300/[.06] text-violet-200"><Scissors className="h-4 w-4" /></span><div><p className="text-[10px] font-semibold uppercase tracking-[.24em] text-violet-300/60">Edit Pipeline</p><h2 className="mt-1 text-sm font-semibold text-white">New media operation</h2><p className="text-xs text-white/40">Remove dead space or cut around detected motion.</p></div></div>
        <div className={`relative mt-4 rounded-xl border p-3 text-xs ${configured ? 'border-emerald-400/20 bg-emerald-400/[.05] text-emerald-200' : 'border-amber-400/20 bg-amber-400/[.05] text-amber-200'}`}><div className="flex items-center gap-2">{configured ? <CheckCircle2 className="h-4 w-4" /> : <TriangleAlert className="h-4 w-4" />}<span>{configured ? 'Auto-Editor execution node online' : 'Auto-Editor execution node offline'}</span></div>{!configured && <p className="mt-1 text-[11px] text-amber-200/70">Set AUTO_EDITOR_WORKER_URL on the deployment before media operations can run.</p>}</div>
        <div className="relative mt-4 space-y-3">
          <Field label="Input asset"><input value={inputName} onChange={(event) => setInputName(event.target.value)} placeholder="Launch video.mp4" className={control} /></Field>
          <Field label="Source URL"><input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://…/video.mp4" className={control} /></Field>
          <div className="grid grid-cols-2 gap-2"><Field label="Edit method"><select value={mode} onChange={(event) => setMode(event.target.value)} className={control}><option value="silence">Silence</option><option value="motion">Motion</option></select></Field><Field label="Threshold"><input type="number" min="0" max="1" step="0.01" value={threshold} onChange={(event) => setThreshold(event.target.value)} className={control} /></Field></div>
          <div className="grid grid-cols-2 gap-2"><Field label="Before margin (ms)"><input type="number" min="0" value={marginBefore} onChange={(event) => setMarginBefore(event.target.value)} className={control} /></Field><Field label="After margin (ms)"><input type="number" min="0" value={marginAfter} onChange={(event) => setMarginAfter(event.target.value)} className={control} /></Field></div>
          <Field label="Export target"><select value={outputFormat} onChange={(event) => setOutputFormat(event.target.value)} className={control}><option value="mp4">MP4</option><option value="mov">MOV</option><option value="premiere">Premiere</option><option value="resolve">DaVinci Resolve</option><option value="final-cut-pro">Final Cut Pro</option><option value="shotcut">Shotcut</option><option value="kdenlive">Kdenlive</option><option value="clip-sequence">Clip sequence</option></select></Field>
          <button disabled={!canSubmit || create.isPending} onClick={() => create.mutate()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-300/20 bg-violet-300/[.1] px-4 py-2.5 text-sm font-medium text-violet-50 transition hover:bg-violet-300/[.16] disabled:opacity-40">{create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Start media operation</button>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[24px] border border-white/10 bg-black/40 p-5 shadow-[0_24px_70px_rgba(0,0,0,.28)] backdrop-blur-xl">
        <div aria-hidden className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="relative flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.24em] text-white/30">Execution Ledger</p><h2 className="mt-1 text-sm font-semibold text-white">Media operation history</h2><p className="mt-1 text-xs text-white/40">Authoritative worker state and render outputs.</p></div>{overview.isFetching && <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />}</div>
        <div className="relative mt-4 space-y-3">{jobs.length === 0 ? <Empty icon={Film} title="No media operations yet" desc="Submit an operation after your media worker is configured." /> : jobs.map((job) => <div key={job.id} className="rounded-xl border border-white/8 bg-white/[.025] p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-medium text-white">{job.input_name}</p><p className="mt-1 text-[11px] text-white/35">{job.mode} · threshold {job.threshold} · {job.output_format}</p></div><Status value={job.status} /></div><p className="mt-2 truncate text-[11px] text-white/25">{job.source_url}</p>{job.error_message && <p className="mt-2 text-xs text-rose-300">{job.error_message}</p>}<div className="mt-3 flex gap-2">{job.worker_job_id && !['completed','failed'].includes(job.status) && <button onClick={() => refreshJob.mutate(job.id)} disabled={refreshJob.isPending && refreshJob.variables === job.id} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300"><RefreshCw className="h-3.5 w-3.5" />Refresh</button>}{job.output_url && <a href={job.output_url} target="_blank" rel="noreferrer" className="rounded-lg border border-emerald-400/20 px-2.5 py-1.5 text-xs text-emerald-300">Open output</a>}</div></div>)}</div>
      </section>
    </div>

    <MediaTimelinePanel jobs={jobs} />
  </>;
}

const control = 'w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-xs text-white outline-none transition focus:border-violet-300/35 focus:bg-black/45';
function Field({ label, children }) { return <label className="block"><span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[.18em] text-white/30">{label}</span>{children}</label>; }
function Status({ value }) { const tone = value === 'completed' ? 'text-emerald-300 border-emerald-400/20' : value === 'failed' ? 'text-rose-300 border-rose-400/20' : 'text-amber-300 border-amber-400/20'; return <span className={`rounded-full border bg-black/20 px-2 py-1 text-[10px] font-medium uppercase ${tone}`}>{value}</span>; }
