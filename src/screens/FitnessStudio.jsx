import { useEffect, useMemo, useState } from 'react';
import { Dumbbell, Loader2, Plus, Scale, ShieldCheck } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { useWorkspace } from '@/hooks/use-workspace';
import { createFitnessWorkout, getFitnessOverview, recordFitnessWeight, saveFitnessProfile } from '@/lib/fitness/fitness.functions';
import { friendlyMessage } from '@/lib/errors';

const today = () => new Date().toISOString().slice(0, 10);

export default function FitnessStudio() {
  const { session } = useWorkspace();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [goal, setGoal] = useState('');
  const [units, setUnits] = useState('metric');
  const [weight, setWeight] = useState('');
  const [workoutName, setWorkoutName] = useState('');
  const [exerciseName, setExerciseName] = useState('');
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('10');

  const load = async () => {
    if (session !== 'yes') return;
    try {
      const next = await getFitnessOverview({ data: undefined });
      setData(next);
      setGoal(next.profile?.goal ?? '');
      setUnits(next.profile?.units ?? 'metric');
    } catch (e) { setError(e); }
  };
  useEffect(() => { load(); }, [session]);

  const latestWeight = useMemo(() => data?.weights?.[0]?.weight ?? null, [data]);

  const saveProfile = async () => {
    setBusy(true); setError(null);
    try { await saveFitnessProfile({ data: { goal, units } }); await load(); }
    catch (e) { setError(e); } finally { setBusy(false); }
  };
  const addWeight = async () => {
    const value = Number(weight);
    if (!Number.isFinite(value) || value <= 0) return;
    setBusy(true); setError(null);
    try { await recordFitnessWeight({ data: { weight: value, recordedOn: today() } }); setWeight(''); await load(); }
    catch (e) { setError(e); } finally { setBusy(false); }
  };
  const addWorkout = async () => {
    if (!workoutName.trim() || !exerciseName.trim()) return;
    setBusy(true); setError(null);
    try {
      await createFitnessWorkout({ data: { name: workoutName.trim(), scheduledFor: today(), exercises: [{ name: exerciseName.trim(), sets: Number(sets), reps: Number(reps) }] } });
      setWorkoutName(''); setExerciseName(''); await load();
    } catch (e) { setError(e); } finally { setBusy(false); }
  };

  const workouts = data?.workouts ?? [];
  return <>
    <PageHeader eyebrow="Personal workspace" title="Fitness Studio" description="An openGym-inspired workout and body-weight workspace using PalladiumAI auth, RLS and audit instead of importing a second account/backend stack." />
    {error && <div className="mb-4 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-xs text-rose-200">{friendlyMessage(error)}</div>}
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
          <div className="flex items-center gap-2"><Dumbbell className="h-4 w-4 text-violet-300"/><h2 className="text-sm font-semibold text-white">Plan a workout</h2></div>
          <div className="mt-4 grid gap-3 md:grid-cols-2"><Field label="Workout name"><input className="field" value={workoutName} onChange={(e)=>setWorkoutName(e.target.value)} placeholder="Upper body"/></Field><Field label="Exercise"><input className="field" value={exerciseName} onChange={(e)=>setExerciseName(e.target.value)} placeholder="Bench press"/></Field><Field label="Sets"><input className="field" type="number" min="1" max="20" value={sets} onChange={(e)=>setSets(e.target.value)}/></Field><Field label="Reps"><input className="field" type="number" min="1" max="500" value={reps} onChange={(e)=>setReps(e.target.value)}/></Field></div>
          <button onClick={addWorkout} disabled={busy || !workoutName.trim() || !exerciseName.trim()} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-medium text-white disabled:opacity-40">{busy ? <Loader2 className="h-4 w-4 animate-spin"/> : <Plus className="h-4 w-4"/>}Add workout</button>
        </section>
        <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><h2 className="text-sm font-semibold text-white">Workout history</h2><div className="mt-3 space-y-2">{workouts.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-zinc-500">No workouts yet.</p> : workouts.map((workout)=><div key={workout.id} className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="flex items-center justify-between gap-3"><p className="text-xs font-medium text-white">{workout.name}</p><span className="text-[10px] text-zinc-600">{workout.scheduled_for ?? 'Unscheduled'}</span></div><p className="mt-2 text-[11px] text-zinc-500">{Array.isArray(workout.exercises) ? workout.exercises.map((x)=>`${x.name} · ${x.sets}×${x.reps ?? '—'}`).join(' · ') : 'Workout exercises'}</p></div>)}</div></section>
      </div>
      <aside className="space-y-4">
        <section className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><h3 className="text-xs font-semibold text-white">Profile</h3><div className="mt-3 space-y-3"><Field label="Goal"><textarea rows={3} className="field resize-none" value={goal} onChange={(e)=>setGoal(e.target.value)} placeholder="Build strength and improve conditioning"/></Field><Field label="Units"><select className="field" value={units} onChange={(e)=>setUnits(e.target.value)}><option value="metric">Metric</option><option value="imperial">Imperial</option></select></Field><button onClick={saveProfile} disabled={busy} className="w-full rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5">Save profile</button></div></section>
        <section className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="flex items-center gap-2"><Scale className="h-4 w-4 text-violet-300"/><h3 className="text-xs font-semibold text-white">Body weight</h3></div><p className="mt-2 text-2xl font-semibold text-white">{latestWeight ?? '—'}</p><p className="text-[10px] text-zinc-600">latest {units === 'metric' ? 'kg' : 'lb'} entry</p><div className="mt-3 flex gap-2"><input className="field" type="number" step="0.1" value={weight} onChange={(e)=>setWeight(e.target.value)} placeholder={units === 'metric' ? 'kg' : 'lb'}/><button onClick={addWeight} disabled={busy || !weight} className="rounded-xl bg-violet-600 px-3 text-xs text-white disabled:opacity-40">Log</button></div></section>
        <section className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[.05] p-4 text-[11px] leading-5 text-emerald-100/75"><ShieldCheck className="mb-2 h-4 w-4 text-emerald-300"/>Fitness data stays in PalladiumAI's owner-scoped storage. No openGym authentication, server or account system is duplicated.</section>
      </aside>
    </div>
    <style>{`.field{width:100%;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.22);border-radius:.75rem;padding:.65rem .75rem;font-size:.75rem;color:white;outline:none}.field:focus{border-color:rgba(167,139,250,.45)}.field option{background:#11131a}`}</style>
  </>;
}
function Field({ label, children }) { return <label className="block"><span className="mb-1 block text-[11px] font-medium text-zinc-400">{label}</span>{children}</label>; }
