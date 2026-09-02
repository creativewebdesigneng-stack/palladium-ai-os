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

  const overview = useQuery({ queryKey: ['voice-studio-overview'], queryFn: () => overviewFn({ data: {} }), enabled: session === 'yes', retry: false });
  const capability = overview.data?.capabilities?.openai;
  const voices = capability?.voices ?? ['alloy', 'coral', 'nova', 'sage'];
  const effectiveVoice = customVoice.trim() || voice;

  const synth = useMutation({
    mutationFn: () => synthFn({ data: { provider: 'openai', text: text.trim(), voice: effectiveVoice, instructions: instructions.trim() || null, format, speed } }),
    onSuccess: async (data) => { setAudioUrl(`data:${data.contentType};base64,${data.audioBase64}`); await qc.invalidateQueries({ queryKey: ['voice-studio-overview'] }); },
  });
  const transcribe = useMutation({
    mutationFn: async () => {
      const encoded = await fileToBase64(audioFile);
      return transcribeFn({ data: { provider: 'openai', audioBase64: encoded, filename: audioFile.name, mimeType: normalizeMime(audioFile), language: language.trim() || null } });
    },
    onSuccess: async (data) => { setTranscript(data.text); await qc.invalidateQueries({ queryKey: ['voice-studio-overview'] }); },
  });

  const jobs = overview.data?.jobs ?? [];
  const completed = useMemo(() => jobs.filter((job) => job.status === 'completed').length, [jobs]);
  const error = overview.error || synth.error || transcribe.error;

  return (
    <>
      <PageHeader eyebrow="Blackstar Voice Intelligence" title="Voice Operations" description="Generate and transcribe production audio through protected server-side intelligence providers with auditable execution history and provider-neutral orchestration." action={<span className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] ${capability?.configured ? 'border-emerald-400/20 bg-emerald-400/[.07] text-emerald-200' : 'border-amber-400/20 bg-amber-400/[.07] text-amber-200'}`}><Radio className="h-3.5 w-3.5" />{capability?.configured ? 'Voice node online' : 'Voice node requires configuration'}</span>} />

      {error && <div className="mb-5 rounded-2xl border border-rose-400/20 bg-rose-400/[.045] p-3 text-xs text-rose-200 backdrop-blur-xl">{friendlyMessage(error)}</div>}
      <div className="mb-5 grid gap-3 sm:grid-cols-3"><Metric icon={AudioLines} label="Voice operations" value={jobs.length} /><Metric icon={Play} label="Completed runs" value={completed} /><Metric icon={Sparkles} label="Intelligence modes" value="TTS + STT" /></div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="relative overflow-hidden rounded-[24px] border border-violet-300/10 bg-[linear-gradient(145deg,rgba(14,11,20,.92),rgba(7,7,11,.96))] p-5 shadow-[0_22px_70px_rgba(0,0,0,.25)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/25 to-transparent" />
          <div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl border border-violet-300/15 bg-violet-400/[.07]"><Volume2 className="h-4 w-4 text-violet-300" /></span><div><p className="text-[9px] font-semibold uppercase tracking-[.22em] text-violet-300/65">Synthesis node</p><h2 className="text-sm font-semibold text-white">Text to speech</h2></div></div>
          <p className="mt-3 text-[11px] leading-5 text-zinc-500">Generate real audio through the configured provider. Built-in voices remain available and eligible custom voice IDs can be addressed explicitly.</p>
          <label className="mt-4 block"><span className="label">Voice script</span><textarea value={text} onChange={(e) => setText(e.target.value)} className="input min-h-40 resize-y py-2.5" maxLength={4096} placeholder="What should Blackstar synthesize?" /></label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label><span className="label">Built-in voice</span><select value={voice} onChange={(e) => setVoice(e.target.value)} className="input h-10">{voices.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label><span className="label">Custom voice ID</span><input value={customVoice} onChange={(e) => setCustomVoice(e.target.value)} className="input h-10" placeholder="voice_…" /></label>
            <label><span className="label">Output format</span><select value={format} onChange={(e) => setFormat(e.target.value)} className="input h-10">{(capability?.formats ?? ['mp3', 'wav', 'opus']).map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label><span className="label">Execution speed · {speed.toFixed(2)}×</span><input type="range" min="0.25" max="4" step="0.05" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="mt-3 w-full accent-violet-400" /></label>
          </div>
          <label className="mt-3 block"><span className="label">Delivery instructions</span><textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} className="input min-h-20 resize-y py-2.5" maxLength={2000} placeholder="Warm, confident, measured pace…" /></label>
          <button type="button" disabled={!text.trim() || synth.isPending || !capability?.configured} onClick={() => synth.mutate()} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-violet-200/20 bg-violet-300 px-4 py-2.5 text-sm font-semibold text-[#09070d] shadow-[0_0_26px_rgba(167,139,250,.12)] transition hover:bg-violet-200 disabled:opacity-40">{synth.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}{synth.isPending ? 'Synthesizing…' : 'Execute synthesis'}</button>
          {audioUrl && <div className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-400/[.03] p-3"><p className="mb-2 text-[10px] font-medium uppercase tracking-[.14em] text-emerald-300">Synthesis complete</p><audio controls src={audioUrl} className="w-full" /></div>}
          {capability?.customVoiceNote && <p className="mt-3 text-[10px] leading-relaxed text-zinc-600">{capability.customVoiceNote}</p>}
        </section>

        <section className="relative overflow-hidden rounded-[24px] border border-violet-300/10 bg-[linear-gradient(145deg,rgba(14,11,20,.92),rgba(7,7,11,.96))] p-5 shadow-[0_22px_70px_rgba(0,0,0,.25)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/25 to-transparent" />
          <div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl border border-violet-300/15 bg-violet-400/[.07]"><Mic2 className="h-4 w-4 text-violet-300" /></span><div><p className="text-[9px] font-semibold uppercase tracking-[.22em] text-violet-300/65">Transcription node</p><h2 className="text-sm font-semibold text-white">Speech to text</h2></div></div>
          <p className="mt-3 text-[11px] leading-5 text-zinc-500">Submit supported audio to the configured server provider. Audio leaves the browser only when you explicitly execute transcription.</p>
          <label className="mt-4 grid min-h-40 cursor-pointer place-items-center rounded-2xl border border-dashed border-violet-300/15 bg-black/25 p-6 text-center transition hover:border-violet-300/30 hover:bg-violet-400/[.025]"><input type="file" accept="audio/*,.mp3,.mp4,.m4a,.wav,.webm,.ogg,.flac,.aac" className="hidden" onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)} /><div><Upload className="mx-auto h-6 w-6 text-violet-300" /><p className="mt-2 text-xs font-medium text-white">{audioFile ? audioFile.name : 'Select audio source'}</p><p className="mt-1 text-[10px] text-zinc-600">MP3, MP4/M4A, WAV, WebM, OGG, AAC or FLAC</p></div></label>
          <label className="mt-3 block"><span className="label">Language hint</span><input value={language} onChange={(e) => setLanguage(e.target.value)} className="input h-10" placeholder="en, fr, es…" maxLength={20} /></label>
          <button type="button" disabled={!audioFile || transcribe.isPending || !capability?.configured} onClick={() => transcribe.mutate()} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-violet-200/20 bg-violet-300 px-4 py-2.5 text-sm font-semibold text-[#09070d] shadow-[0_0_26px_rgba(167,139,250,.12)] transition hover:bg-violet-200 disabled:opacity-40">{transcribe.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileAudio className="h-4 w-4" />}{transcribe.isPending ? 'Transcribing…' : 'Execute transcription'}</button>
          {transcript && <div className="mt-4 rounded-xl border border-violet-300/10 bg-black/25 p-4"><p className="text-[10px] font-medium uppercase tracking-[.14em] text-violet-300/65">Intelligence transcript</p><p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-zinc-200">{transcript}</p></div>}
        </section>
      </div>

      <section className="relative mt-5 overflow-hidden rounded-[24px] border border-violet-300/10 bg-black/35 p-5 backdrop-blur-xl"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[9px] font-semibold uppercase tracking-[.22em] text-violet-300/60">Execution ledger</p><h2 className="mt-1 text-sm font-semibold text-white">Voice operation history</h2><p className="mt-1 text-[11px] text-zinc-500">Persisted execution metadata and transcripts. Provider credentials remain isolated from the client surface.</p></div><span className="rounded-lg border border-violet-300/10 bg-violet-400/[.035] px-2.5 py-1.5 text-[10px] uppercase tracking-[.12em] text-zinc-500">{jobs.length} recorded</span></div>{overview.isLoading ? <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading ledger…</div> : jobs.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-xs"><thead className="text-[10px] uppercase tracking-wide text-zinc-600"><tr><th className="pb-2">Operation</th><th className="pb-2">Provider / model</th><th className="pb-2">Voice</th><th className="pb-2">State</th><th className="pb-2">Runtime</th><th className="pb-2">Created</th></tr></thead><tbody className="divide-y divide-violet-300/[.06]">{jobs.map((job) => <tr key={job.id}><td className="py-2.5 pr-3 text-zinc-300">{job.kind.toUpperCase()}</td><td className="py-2.5 pr-3"><p className="text-zinc-300">{job.provider}</p><code className="text-[10px] text-violet-200">{job.model}</code></td><td className="py-2.5 pr-3 text-zinc-400">{job.voice ?? '—'}</td><td className="py-2.5 pr-3"><Status value={job.status} /></td><td className="py-2.5 pr-3 text-zinc-500">{job.duration_ms != null ? `${job.duration_ms} ms` : '—'}</td><td className="py-2.5 text-zinc-500">{new Date(job.created_at).toLocaleString('en-GB')}</td></tr>)}</tbody></table></div> : <p className="mt-4 rounded-xl border border-dashed border-violet-300/10 p-8 text-center text-xs text-zinc-500">No voice operations recorded yet.</p>}</section>
      <style>{`.label{margin-bottom:.375rem;display:block;font-size:.625rem;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:rgba(161,161,170,.7)}.input{width:100%;border-radius:.75rem;border:1px solid rgba(196,181,253,.1);background:rgba(0,0,0,.3);padding-left:.75rem;padding-right:.75rem;font-size:.75rem;color:white;outline:none}.input:focus{border-color:rgba(196,181,253,.35);box-shadow:0 0 0 3px rgba(139,92,246,.04)}.input::placeholder{color:rgb(82 82 91)}`}</style>
    </>
  );
}

function fileToBase64(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => { const value = String(reader.result ?? ''); resolve(value.includes(',') ? value.slice(value.indexOf(',') + 1) : value); }; reader.onerror = () => reject(reader.error ?? new Error('Unable to read audio file.')); reader.readAsDataURL(file); }); }
function normalizeMime(file) { const value = file.type || ''; const allowed = ['audio/mpeg','audio/mp3','audio/mp4','audio/m4a','audio/wav','audio/x-wav','audio/webm','audio/ogg','audio/aac','audio/flac']; if (allowed.includes(value)) return value; const ext = file.name.split('.').pop()?.toLowerCase(); return ({ mp3:'audio/mpeg', mp4:'audio/mp4', m4a:'audio/m4a', wav:'audio/wav', webm:'audio/webm', ogg:'audio/ogg', aac:'audio/aac', flac:'audio/flac' })[ext] || 'audio/mpeg'; }
function Metric({ icon: Icon, label, value }) { return <div className="relative overflow-hidden rounded-2xl border border-violet-300/10 bg-black/35 p-4 backdrop-blur-xl"><div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/20 to-transparent" /><div className="flex items-center gap-1.5 text-zinc-500"><Icon className="h-3.5 w-3.5 text-violet-300/70" /><span className="text-[10px] uppercase tracking-[.14em]">{label}</span></div><p className="mt-1 text-xl font-semibold tracking-tight text-white">{value}</p></div>; }
function Status({ value }) { return <span className={value === 'completed' ? 'text-emerald-300' : value === 'failed' ? 'text-rose-300' : 'text-amber-300'}>{value}</span>; }
