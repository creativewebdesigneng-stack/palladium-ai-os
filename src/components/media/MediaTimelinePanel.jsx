import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Clock3, Loader2, Plus, Waypoints } from 'lucide-react';
import { friendlyMessage } from '@/lib/errors';
import { useToast } from '@/components/ui/use-toast';
import { getIntegratedCapabilityOverview, saveMediaTimelineKeyframe, saveMediaTimelineTrack } from '@/lib/platform/integrated-capabilities.functions';

const control = 'w-full rounded-xl border border-white/10 bg-[#11131a] px-3 py-2 text-xs text-white outline-none focus:border-violet-400/40';

function parseValue(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('Keyframe value must be a JSON object.');
    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error('Keyframe value must be valid JSON, for example {"x": 12}.');
    throw error;
  }
}

export default function MediaTimelinePanel({ jobs = [] }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const overviewFn = useServerFn(getIntegratedCapabilityOverview);
  const saveTrackFn = useServerFn(saveMediaTimelineTrack);
  const saveKeyframeFn = useServerFn(saveMediaTimelineKeyframe);
  const [track, setTrack] = useState({ name: '', kind: 'value', mediaJobId: '' });
  const [keyframe, setKeyframe] = useState({ trackId: '', timeMs: '0', value: '{}', interpolation: 'linear' });
  const overview = useQuery({ queryKey: ['integrated-capabilities'], queryFn: () => overviewFn({ data: undefined }), retry: false });
  const refresh = () => qc.invalidateQueries({ queryKey: ['integrated-capabilities'] });
  const saveTrack = useMutation({ mutationFn: () => saveTrackFn({ data: { ...track, mediaJobId: track.mediaJobId || null } }), onSuccess: async (row) => { setKeyframe((value) => ({ ...value, trackId: row.id })); setTrack((value) => ({ ...value, name: '' })); await refresh(); toast({ title: 'Timeline track created' }); }, onError: (error) => toast({ variant: 'destructive', title: 'Could not create track', description: friendlyMessage(error) }) });
  const saveKeyframe = useMutation({ mutationFn: () => saveKeyframeFn({ data: { trackId: keyframe.trackId, timeMs: Number(keyframe.timeMs), value: parseValue(keyframe.value), interpolation: keyframe.interpolation } }), onSuccess: async () => { await refresh(); toast({ title: 'Keyframe saved' }); }, onError: (error) => toast({ variant: 'destructive', title: 'Could not save keyframe', description: friendlyMessage(error) }) });
  const tracks = overview.data?.tracks ?? [];
  const keyframes = overview.data?.keyframes ?? [];
  const selectedFrames = useMemo(() => keyframes.filter((item) => item.track_id === keyframe.trackId), [keyframes, keyframe.trackId]);

  return <section className="mt-4 rounded-2xl border border-white/10 bg-white/[.03] p-5">
    <div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10"><Waypoints className="h-5 w-5 text-violet-300" /></span><div><h2 className="text-sm font-semibold text-white">Timeline & synchronisation tracks</h2><p className="mt-1 text-xs leading-5 text-zinc-500">Native PalladiumAI keyframes for value, camera, audio and event timelines. These extend Media Studio rather than installing a separate Rocket application.</p></div></div>
    <div className="mt-4 grid gap-4 xl:grid-cols-2">
      <div className="rounded-xl border border-white/10 bg-black/20 p-4"><h3 className="text-xs font-medium text-white">Create track</h3><div className="mt-3 grid gap-2 sm:grid-cols-2"><input className={control} value={track.name} onChange={(e) => setTrack({ ...track, name: e.target.value })} placeholder="Camera zoom" /><select className={control} value={track.kind} onChange={(e) => setTrack({ ...track, kind: e.target.value })}><option value="value">Value</option><option value="camera">Camera</option><option value="audio">Audio</option><option value="event">Event</option></select></div><select className={`${control} mt-2`} value={track.mediaJobId} onChange={(e) => setTrack({ ...track, mediaJobId: e.target.value })}><option value="">Not linked to a media job</option>{jobs.map((job) => <option key={job.id} value={job.id}>{job.input_name}</option>)}</select><button disabled={!track.name.trim() || saveTrack.isPending} onClick={() => saveTrack.mutate()} className="mt-3 flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs text-violet-200 disabled:opacity-40">{saveTrack.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Add track</button></div>
      <div className="rounded-xl border border-white/10 bg-black/20 p-4"><h3 className="text-xs font-medium text-white">Save keyframe</h3><select className={`${control} mt-3`} value={keyframe.trackId} onChange={(e) => setKeyframe({ ...keyframe, trackId: e.target.value })}><option value="">Select track</option>{tracks.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.kind}</option>)}</select><div className="mt-2 grid grid-cols-2 gap-2"><input className={control} type="number" min="0" max="86400000" value={keyframe.timeMs} onChange={(e) => setKeyframe({ ...keyframe, timeMs: e.target.value })} placeholder="Time ms" /><select className={control} value={keyframe.interpolation} onChange={(e) => setKeyframe({ ...keyframe, interpolation: e.target.value })}><option value="step">Step</option><option value="linear">Linear</option><option value="smooth">Smooth</option></select></div><textarea className={`${control} mt-2 min-h-20 font-mono`} value={keyframe.value} onChange={(e) => setKeyframe({ ...keyframe, value: e.target.value })} placeholder='{"x":12,"zoom":1.2}' /><button disabled={!keyframe.trackId || saveKeyframe.isPending} onClick={() => saveKeyframe.mutate()} className="mt-3 flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs text-violet-200 disabled:opacity-40">{saveKeyframe.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock3 className="h-4 w-4" />}Save keyframe</button></div>
    </div>
    <div className="mt-4 space-y-2">{overview.isLoading ? <Loader2 className="h-4 w-4 animate-spin text-zinc-500" /> : tracks.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-zinc-500">No timeline tracks yet.</p> : tracks.map((item) => { const frames = keyframes.filter((frame) => frame.track_id === item.id); return <div key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="flex items-center gap-2"><p className="text-xs font-medium text-white">{item.name}</p><span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-400">{item.kind}</span><span className="ml-auto text-[10px] text-zinc-600">{frames.length} keyframe{frames.length === 1 ? '' : 's'}</span></div><div className="mt-2 flex flex-wrap gap-2">{frames.slice(0, 12).map((frame) => <button key={frame.id} onClick={() => setKeyframe({ trackId: item.id, timeMs: String(frame.time_ms), value: JSON.stringify(frame.value ?? {}), interpolation: frame.interpolation })} className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-zinc-400">{frame.time_ms}ms · {frame.interpolation}</button>)}</div></div>; })}</div>
    {keyframe.trackId && selectedFrames.length > 0 && <p className="mt-3 text-[10px] text-zinc-600">Selecting an existing time lets you update that deterministic keyframe rather than creating a duplicate timestamp.</p>}
  </section>;
}
