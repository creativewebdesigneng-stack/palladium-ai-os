import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { AudioLines, FileAudio, Loader2, Mic2, Play, Radio, Sparkles, Upload, Volume2 } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { useWorkspace } from '@/hooks/use-workspace';
import { friendlyMessage } from '@/lib/errors';
import { getVoiceStudioOverview, synthesizeVoice, transcribeVoice } from '@/lib/voice/voice-studio.functions';

export default function VoiceStudio() {
  const { session } = useWorkspace();
  const qc = useQueryClient();
  const overviewFn = useServerFn(getVoiceStudioOverview);
  const synthFn = useServerFn(synthesizeVoice);
  const transcribeFn = useServerFn(transcribeVoice);
  const [text, setText] = useState('');
  const [voice, setVoice] = useState('alloy');
  const [customVoice, setCustomVoice] = useState('');
  const [instructions, setInstructions] = useState('');
  const [format, setFormat] = useState('mp3');
  const [speed, setSpeed] = useState(1);
  const [audioUrl, setAudioUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  const [language, setLanguage] = useState('');
  const [audioFile, setAudioFile] = useState(null);

  const overview = useQuery({
    queryKey: ['voice-studio-overview'],
    queryFn: () => overviewFn({ data: {} }),
    enabled: session === 'yes',
    retry: false,
  });
  const capability = overview.data?.capabilities?.openai;
  const voices = capability?.voices ?? ['alloy', 'coral', 'nova', 'sage'];
  const effectiveVoice = customVoice.trim() || voice;

  const synth = useMutation({
    mutationFn: () => synthFn({ data: { provider: 'openai', text: text.trim(), voice: effectiveVoice, instructions: instructions.trim() || null, format, speed } }),
    onSuccess: async (data) => {
      setAudioUrl(`data:${data.contentType};base64,${data.audioBase64}`);
      await qc.invalidateQueries({ queryKey: ['voice-studio-overview'] });
    },
  });
  const transcribe = useMutation({
    mutationFn: async () => {
      const encoded = await fileToBase64(audioFile);
      return transcribeFn({ data: { provider: 'openai', audioBase64: encoded, filename: audioFile.name, mimeType: normalizeMime(audioFile), language: language.trim() || null } });
    },
    onSuccess: async (data) => {
      setTranscript(data.text);
      await qc.invalidateQueries({ queryKey: ['voice-studio-overview'] });
    },
  });

  const jobs = overview.data?.jobs ?? [];
  const completed = useMemo(() => jobs.filter((job) => job.status === 'completed').length, [jobs]);
  const error = overview.error || synth.error || transcribe.error;

  return (
    <>
      <PageHeader eyebrow="Audio AI" title="Voice Studio" description="Native text-to-speech and speech-to-text using server-side audio providers, with auditable job history and a provider-neutral foundation for local and cloud engines." action={<span className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] ${capability?.configured ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200' : 'border-amber-400/20 bg-amber-400/10 text-amber-200'}`}><Radio className="h-3.5 w-3.5" />{capability?.configured ? 'OpenAI audio ready' : 'Audio provider not configured'}</span>} />

      {error && <div className="mb-5 rounded-xl border border-rose-400/20 bg-rose-400/[.05] p-3 text-xs text-rose-200">{friendlyMessage(error)}</div>}
      <div className="mb-5 grid gap-3 sm:grid-cols-3"><Metric icon={AudioLines} label="Jobs" value={jobs.length} /><Metric icon={Play} label="Completed" value={completed} /><Metric icon={Sparkles} label="Voice modes" value="TTS + STT" /></div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
          <div className="flex items-center gap-2"><Volume2 className="h-4 w-4 text-violet-300" /><h2 className="text-sm font-semibold text-white">Text to speech</h2></div>
          <p className="mt-1 text-[11px] text-zinc-500">Generate real audio. Built-in voices are available when OpenAI audio is configured; eligible custom voice IDs can be used explicitly.</p>
          <label className="mt-4 block"><span className="label">Script</span><textarea value={text} onChange={(e) => setText(e.target.value)} className="input min-h-40 resize-y py-2.5" maxLength={4096} placeholder="What should the voice say?" /></label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label><span className="label">Built-in voice</span><select value={voice} onChange={(e) => setVoice(e.target.value)} className="input h-10">{voices.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label><span className="label">Custom voice ID (optional)</span><input value={customVoice} onChange={(e) => setCustomVoice(e.target.value)} className="input h-10" placeholder="voice_…" /></label>
            <label><span className="label">Format</span><select value={format} onChange={(e) => setFormat(e.target.value)} className="input h-10">{(capability?.formats ?? ['mp3', 'wav', 'opus']).map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label><span className="label">Speed · {speed.toFixed(2)}×</span><input type="range" min="0.25" max="4" step="0.05" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="mt-3 w-full accent-violet-500" /></label>
          </div>
          <label className="mt-3 block"><span className="label">Delivery instructions (optional)</span><textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} className="input min-h-20 resize-y py-2.5" maxLength={2000} placeholder="Warm, confident, measured pace…" /></label>
          <button type="button" disabled={!text.trim() || synth.isPending || !capability?.configured} onClick={() => synth.mutate()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40">{synth.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}{synth.isPending ? 'Generating audio…' : 'Generate speech'}</button>
          {audioUrl && <div className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-400/[.03] p-3"><p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-emerald-300">Generated audio</p><audio controls src={audioUrl} className="w-full" /></div>}
          {capability?.customVoiceNote && <p className="mt-3 text-[10px] leading-relaxed text-zinc-600">{capability.customVoiceNote}</p>}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
          <div className="flex items-center gap-2"><Mic2 className="h-4 w-4 text-violet-300" /><h2 className="text-sm font-semibold text-white">Speech to text</h2></div>
          <p className="mt-1 text-[11px] text-zinc-500">Upload common audio formats and transcribe them through the configured server provider. Audio is sent only when you explicitly run transcription.</p>
          <label className="mt-4 grid min-h-40 cursor-pointer place-items-center rounded-2xl border border-dashed border-white/15 bg-black/20 p-6 text-center hover:border-violet-400/30"><input type="file" accept="audio/*,.mp3,.mp4,.m4a,.wav,.webm,.ogg,.flac,.aac" className="hidden" onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)} /><div><Upload className="mx-auto h-6 w-6 text-violet-300" /><p className="mt-2 text-xs font-medium text-white">{audioFile ? audioFile.name : 'Choose an audio file'}</p><p className="mt-1 text-[10px] text-zinc-600">MP3, MP4/M4A, WAV, WebM, OGG, AAC or FLAC</p></div></label>
          <label className="mt-3 block"><span className="label">Language hint (optional)</span><input value={language} onChange={(e) => setLanguage(e.target.value)} className="input h-10" placeholder="en, fr, es…" maxLength={20} /></label>
          <button type="button" disabled={!audioFile || transcribe.isPending || !capability?.configured} onClick={() => transcribe.mutate()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40">{transcribe.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileAudio className="h-4 w-4" />}{transcribe.isPending ? 'Transcribing…' : 'Transcribe audio'}</button>
          {transcript && <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Transcript</p><p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-zinc-200">{transcript}</p></div>}
        </section>
      </div>

      <section className="mt-5 rounded-2xl border border-white/10 bg-white/[.03] p-5"><h2 className="text-sm font-semibold text-white">Recent voice jobs</h2><p className="mt-1 text-[11px] text-zinc-500">Persisted execution metadata and transcripts; provider credentials are never exposed here.</p>{overview.isLoading ? <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading history…</div> : jobs.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-xs"><thead className="text-[10px] uppercase tracking-wide text-zinc-600"><tr><th className="pb-2">Type</th><th className="pb-2">Provider / model</th><th className="pb-2">Voice</th><th className="pb-2">Status</th><th className="pb-2">Runtime</th><th className="pb-2">Created</th></tr></thead><tbody className="divide-y divide-white/5">{jobs.map((job) => <tr key={job.id}><td className="py-2.5 pr-3 text-zinc-300">{job.kind.toUpperCase()}</td><td className="py-2.5 pr-3"><p className="text-zinc-300">{job.provider}</p><code className="text-[10px] text-violet-200">{job.model}</code></td><td className="py-2.5 pr-3 text-zinc-400">{job.voice ?? '—'}</td><td className="py-2.5 pr-3"><Status value={job.status} /></td><td className="py-2.5 pr-3 text-zinc-500">{job.duration_ms != null ? `${job.duration_ms} ms` : '—'}</td><td className="py-2.5 text-zinc-500">{new Date(job.created_at).toLocaleString('en-GB')}</td></tr>)}</tbody></table></div> : <p className="mt-4 rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-zinc-500">No voice jobs yet.</p>}</section>
      <style>{`.label{margin-bottom:.375rem;display:block;font-size:.625rem;font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:rgb(113 113 122)}.input{width:100%;border-radius:.75rem;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.3);padding-left:.75rem;padding-right:.75rem;font-size:.75rem;color:white;outline:none}.input:focus{border-color:rgba(139,92,246,.45)}.input::placeholder{color:rgb(82 82 91)}`}</style>
    </>
  );
}

function fileToBase64(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => { const value = String(reader.result ?? ''); resolve(value.includes(',') ? value.slice(value.indexOf(',') + 1) : value); }; reader.onerror = () => reject(reader.error ?? new Error('Unable to read audio file.')); reader.readAsDataURL(file); }); }
function normalizeMime(file) { const value = file.type || ''; const allowed = ['audio/mpeg','audio/mp3','audio/mp4','audio/m4a','audio/wav','audio/x-wav','audio/webm','audio/ogg','audio/aac','audio/flac']; if (allowed.includes(value)) return value; const ext = file.name.split('.').pop()?.toLowerCase(); return ({ mp3:'audio/mpeg', mp4:'audio/mp4', m4a:'audio/m4a', wav:'audio/wav', webm:'audio/webm', ogg:'audio/ogg', aac:'audio/aac', flac:'audio/flac' })[ext] || 'audio/mpeg'; }
function Metric({ icon: Icon, label, value }) { return <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="flex items-center gap-1.5 text-zinc-500"><Icon className="h-3.5 w-3.5" /><span className="text-[10px] uppercase tracking-wide">{label}</span></div><p className="mt-1 text-xl font-semibold text-white">{value}</p></div>; }
function Status({ value }) { return <span className={value === 'completed' ? 'text-emerald-300' : value === 'failed' ? 'text-rose-300' : 'text-amber-300'}>{value}</span>; }
