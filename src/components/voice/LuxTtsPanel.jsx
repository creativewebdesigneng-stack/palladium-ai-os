import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { AudioWaveform, Loader2, Mic2, Upload } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { friendlyMessage } from '@/lib/errors';
import { getLuxTtsOverview, synthesizeLuxVoice } from '@/lib/voice/lux-tts.functions';

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result ?? '');
      resolve(value.includes(',') ? value.slice(value.indexOf(',') + 1) : value);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read reference audio.'));
    reader.readAsDataURL(file);
  });
}

function normalizeMime(file) {
  const value = file.type || '';
  const allowed = ['audio/mpeg','audio/mp3','audio/mp4','audio/m4a','audio/wav','audio/x-wav','audio/webm','audio/ogg','audio/aac','audio/flac'];
  if (allowed.includes(value)) return value;
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ({ mp3:'audio/mpeg', mp4:'audio/mp4', m4a:'audio/m4a', wav:'audio/wav', webm:'audio/webm', ogg:'audio/ogg', aac:'audio/aac', flac:'audio/flac' })[ext] || 'audio/wav';
}

export default function LuxTtsPanel({ enabled }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const overviewFn = useServerFn(getLuxTtsOverview);
  const synthFn = useServerFn(synthesizeLuxVoice);
  const [text, setText] = useState('');
  const [reference, setReference] = useState(null);
  const [speed, setSpeed] = useState(1);
  const [steps, setSteps] = useState(4);
  const [audioUrl, setAudioUrl] = useState('');

  const overview = useQuery({ queryKey: ['luxtts-overview'], queryFn: () => overviewFn({ data: {} }), enabled, retry: false });
  const capability = overview.data?.capability;
  const jobs = overview.data?.jobs ?? [];

  const synth = useMutation({
    mutationFn: async () => synthFn({ data: {
      text: text.trim(),
      referenceAudioBase64: await fileToBase64(reference),
      referenceFilename: reference.name,
      referenceMimeType: normalizeMime(reference),
      speed: Number(speed),
      steps: Number(steps),
    } }),
    onSuccess: async (result) => {
      setAudioUrl(`data:${result.contentType};base64,${result.audioBase64}`);
      await qc.invalidateQueries({ queryKey: ['luxtts-overview'] });
      toast({ title: 'LuxTTS voice generated' });
    },
    onError: (error) => toast({ variant: 'destructive', title: 'LuxTTS generation failed', description: friendlyMessage(error) }),
  });

  return (
    <section className="mt-5 rounded-2xl border border-cyan-400/15 bg-cyan-400/[.025] p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2"><AudioWaveform className="h-4 w-4 text-cyan-300" /><h2 className="text-sm font-semibold text-white">LuxTTS local voice cloning</h2></div>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-zinc-400">High-quality 48 kHz voice cloning is available through a separately deployed LuxTTS worker. PalladiumAI keeps the consent-sensitive reference audio in-memory for the explicit request only and stores job metadata rather than the uploaded voice sample.</p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] ${capability?.configured ? 'border-emerald-400/20 text-emerald-300' : 'border-amber-400/20 text-amber-300'}`}>{capability?.configured ? 'LuxTTS worker ready' : 'Worker not configured'}</span>
      </div>

      {overview.error && <div className="mt-3 rounded-xl border border-rose-400/20 bg-rose-400/[.05] p-3 text-xs text-rose-200">{friendlyMessage(overview.error)}</div>}
      {!capability?.configured && <p className="mt-3 text-xs text-amber-200">Set LUXTTS_WORKER_URL on the deployment before local voice cloning can run.</p>}

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <label className="block"><span className="label">Script</span><textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} maxLength={4096} className="input resize-y py-2.5" placeholder="What should the cloned voice say?" /></label>
          <label className="mt-3 grid min-h-28 cursor-pointer place-items-center rounded-xl border border-dashed border-white/15 bg-black/20 p-4 text-center"><input type="file" accept="audio/*,.mp3,.mp4,.m4a,.wav,.webm,.ogg,.flac,.aac" className="hidden" onChange={(e) => setReference(e.target.files?.[0] ?? null)} /><div><Upload className="mx-auto h-5 w-5 text-cyan-300" /><p className="mt-1 text-xs font-medium text-white">{reference ? reference.name : 'Choose consent-backed reference audio'}</p><p className="mt-1 text-[10px] text-zinc-600">A short clean voice sample works best. The browser sends it only when you generate.</p></div></label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label><span className="label">Speed · {Number(speed).toFixed(2)}×</span><input type="range" min="0.5" max="2" step="0.05" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="mt-3 w-full accent-cyan-500" /></label>
            <label><span className="label">Sampling steps</span><select value={steps} onChange={(e) => setSteps(Number(e.target.value))} className="input h-10"><option value={3}>3 · fast</option><option value={4}>4 · recommended</option><option value={6}>6 · higher quality</option><option value={8}>8 · slower</option></select></label>
          </div>
          <button type="button" disabled={!capability?.configured || !text.trim() || !reference || synth.isPending} onClick={() => synth.mutate()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-medium text-black disabled:opacity-40">{synth.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic2 className="h-4 w-4" />}{synth.isPending ? 'Generating…' : 'Clone voice & generate'}</button>
          {audioUrl && <div className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-400/[.03] p-3"><audio controls src={audioUrl} className="w-full" /></div>}
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-semibold text-white">Recent LuxTTS jobs</p>
          <div className="mt-3 space-y-2">{jobs.length === 0 ? <p className="text-[11px] text-zinc-600">No LuxTTS jobs yet.</p> : jobs.slice(0, 8).map((job) => <div key={job.id} className="rounded-lg border border-white/10 px-3 py-2"><div className="flex items-center justify-between gap-2"><span className="truncate text-[11px] text-zinc-300">{job.reference_filename}</span><span className={job.status === 'completed' ? 'text-[10px] text-emerald-300' : job.status === 'failed' ? 'text-[10px] text-rose-300' : 'text-[10px] text-amber-300'}>{job.status}</span></div><p className="mt-1 line-clamp-2 text-[10px] text-zinc-600">{job.text}</p>{job.duration_ms != null && <p className="mt-1 text-[10px] text-zinc-700">{job.duration_ms} ms · {job.output_bytes ?? 0} bytes</p>}</div>)}</div>
        </div>
      </div>
      <style>{`.label{margin-bottom:.375rem;display:block;font-size:.625rem;font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:rgb(113 113 122)}.input{width:100%;border-radius:.75rem;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.3);padding-left:.75rem;padding-right:.75rem;font-size:.75rem;color:white;outline:none}.input:focus{border-color:rgba(34,211,238,.4)}.input::placeholder{color:rgb(82 82 91)}`}</style>
    </section>
  );
}
