import { useEffect, useMemo, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import {
  Activity, Apple, Brain, Dumbbell, HeartPulse, Loader2, Moon, Plus, Salad,
  ShieldCheck, Sparkles, Stethoscope, Target, Tablets, TrendingUp,
} from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { useWorkspace } from '@/hooks/use-workspace';
import { friendlyMessage } from '@/lib/errors';
import {
  createHealthWorkout, getHealthOverview, logHealthNutrition, logHealthSleep,
  recordHealthMetric, saveHealthGoal, saveHealthMedication, saveHealthProfile,
} from '@/lib/health/health.functions';
import { runHealthCoachInquiry } from '@/lib/health/health-ai.functions';
import HealthPlansRecords from '@/components/health/HealthPlansRecords';

const TABS = [
  ['overview','Overview',Activity],
  ['fitness','Fitness',Dumbbell],
  ['nutrition','Nutrition',Salad],
  ['recovery','Sleep & recovery',Moon],
  ['plans','AI Plans',Brain],
  ['record','Health record',Stethoscope],
  ['coach','AI Health Coach',Sparkles],
];

const today = () => new Date().toISOString().slice(0,10);
const toLocalInput = (date) => {
  const d = date ? new Date(date) : new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0,16);
};
const listText = (value) => Array.isArray(value) ? value.join(', ') : '';

export default function HealthFitnessHub() {
  const { session } = useWorkspace();
  const getOverview = useServerFn(getHealthOverview);
  const saveProfileFn = useServerFn(saveHealthProfile);
  const saveGoalFn = useServerFn(saveHealthGoal);
  const metricFn = useServerFn(recordHealthMetric);
  const workoutFn = useServerFn(createHealthWorkout);
  const nutritionFn = useServerFn(logHealthNutrition);
  const sleepFn = useServerFn(logHealthSleep);
  const medicationFn = useServerFn(saveHealthMedication);
  const coachFn = useServerFn(runHealthCoachInquiry);

  const [tab,setTab] = useState('overview');
  const [data,setData] = useState(null);
  const [busy,setBusy] = useState('');
  const [error,setError] = useState('');
  const [profile,setProfile] = useState({ goal:'',units:'metric',activity_level:'moderate',date_of_birth:'',height_cm:'',dietary_preferences:'',allergies:'',conditions:'',accessibility_notes:'' });
  const [goal,setGoal] = useState({ category:'fitness',title:'',target_value:'',target_unit:'',target_date:'',notes:'' });
  const [metric,setMetric] = useState({ metric_type:'weight',value:'',unit:'kg',notes:'' });
  const [workout,setWorkout] = useState({ name:'',workout_type:'strength',scheduled_for:today(),exercise:'',sets:'3',reps:'10',weight:'',duration_minutes:'',notes:'' });
  const [meal,setMeal] = useState({ meal_type:'meal',name:'',calories:'',protein_g:'',carbs_g:'',fat_g:'',fibre_g:'',water_ml:'',notes:'' });
  const [sleep,setSleep] = useState({ sleep_start:toLocalInput(new Date(Date.now()-8*3600000)),sleep_end:toLocalInput(),quality:'',awake_minutes:'',notes:'' });
  const [med,setMed] = useState({ name:'',dose:'',schedule:'',purpose:'',prescribed_by:'',started_on:'',active:true,notes:'' });
  const [question,setQuestion] = useState('');
  const [turns,setTurns] = useState([]);
  const [coachMeta,setCoachMeta] = useState(null);

  async function load() {
    if (session !== 'yes') return;
    setError('');
    try {
      const next = await getOverview({ data: undefined });
      setData(next);
      const p = next.profile;
      if (p) setProfile({
        goal:p.goal ?? '', units:p.units ?? 'metric', activity_level:p.activity_level ?? 'moderate',
        date_of_birth:p.date_of_birth ?? '', height_cm:p.height_cm ?? '',
        dietary_preferences:listText(p.dietary_preferences), allergies:listText(p.allergies),
        conditions:listText(p.conditions), accessibility_notes:p.accessibility_notes ?? '',
      });
      const unit = p?.units === 'imperial' ? 'lb' : 'kg';
      setMetric((current)=> current.metric_type === 'weight' ? {...current,unit} : current);
    } catch (e) { setError(friendlyMessage(e)); }
  }
  useEffect(()=>{ load(); },[session]);

  async function run(key, action) {
    setBusy(key); setError('');
    try { await action(); await load(); }
    catch (e) { setError(friendlyMessage(e)); }
    finally { setBusy(''); }
  }

  async function saveProfile() {
    await run('profile',()=>saveProfileFn({ data:{
      goal:profile.goal, units:profile.units, activity_level:profile.activity_level,
      date_of_birth:profile.date_of_birth || '', height_cm:profile.height_cm ? Number(profile.height_cm) : undefined,
      dietary_preferences:splitList(profile.dietary_preferences), allergies:splitList(profile.allergies),
      conditions:splitList(profile.conditions), accessibility_notes:profile.accessibility_notes,
    }}));
  }
  async function addGoal() {
    if (!goal.title.trim()) return;
    await run('goal',async()=>{ await saveGoalFn({data:{
      ...goal, target_value:goal.target_value ? Number(goal.target_value) : undefined,
      target_date:goal.target_date || '',
    }}); setGoal({ category:'fitness',title:'',target_value:'',target_unit:'',target_date:'',notes:'' }); });
  }
  async function addMetric() {
    if (metric.value === '') return;
    await run('metric',async()=>{ await metricFn({data:{...metric,value:Number(metric.value)}}); setMetric({...metric,value:'',notes:''}); });
  }
  async function addWorkout() {
    if (!workout.name.trim() || !workout.exercise.trim()) return;
    await run('workout',async()=>{ await workoutFn({data:{
      name:workout.name, workout_type:workout.workout_type, scheduled_for:workout.scheduled_for || '',
      duration_minutes:workout.duration_minutes ? Number(workout.duration_minutes) : undefined, notes:workout.notes,
      exercises:[{ name:workout.exercise, sets:Number(workout.sets), reps:Number(workout.reps), ...(workout.weight ? {weight:Number(workout.weight)} : {}) }],
    }}); setWorkout({...workout,name:'',exercise:'',weight:'',notes:''}); });
  }
  async function addMeal() {
    if (!meal.name.trim()) return;
    const numbers = ['calories','protein_g','carbs_g','fat_g','fibre_g','water_ml'];
    const payload = {...meal};
    for (const key of numbers) payload[key] = meal[key] === '' ? undefined : Number(meal[key]);
    await run('meal',async()=>{ await nutritionFn({data:payload}); setMeal({...meal,name:'',calories:'',protein_g:'',carbs_g:'',fat_g:'',fibre_g:'',water_ml:'',notes:''}); });
  }
  async function addSleep() {
    await run('sleep',async()=>{ await sleepFn({data:{
      sleep_start:new Date(sleep.sleep_start).toISOString(), sleep_end:new Date(sleep.sleep_end).toISOString(),
      quality:sleep.quality ? Number(sleep.quality) : undefined, awake_minutes:sleep.awake_minutes ? Number(sleep.awake_minutes) : undefined, notes:sleep.notes,
    }}); });
  }
  async function addMedication() {
    if (!med.name.trim()) return;
    await run('med',async()=>{ await medicationFn({data:med}); setMed({ name:'',dose:'',schedule:'',purpose:'',prescribed_by:'',started_on:'',active:true,notes:'' }); });
  }
  async function askCoach(e) {
    e?.preventDefault?.();
    const q=question.trim(); if(!q || busy==='coach') return;
    setBusy('coach'); setError('');
    try {
      const result=await coachFn({data:{question:q,history:turns.slice(-8)}});
      setTurns((current)=>[...current,{role:'user',content:q},{role:'assistant',content:result.answer}].slice(-12));
      setCoachMeta(result); setQuestion('');
    } catch(e2){ setError(friendlyMessage(e2)); }
    finally{ setBusy(''); }
  }

  const summary=data?.summary ?? {};
  const latestNutrition=useMemo(()=> (data?.nutrition ?? []).slice(0,6),[data?.nutrition]);
  const recentMetrics=useMemo(()=> (data?.metrics ?? []).slice(0,10),[data?.metrics]);
  const activeGoals=useMemo(()=> (data?.goals ?? []).filter((x)=>x.status==='active'),[data?.goals]);

  return <>
    <PageHeader eyebrow="Personal intelligence" title="Health & Fitness Hub" description="A private Blackstar workspace for fitness, nutrition, sleep, recovery, health records, personal trends and bounded AI health guidance." />
    <div className="mb-5 rounded-2xl border border-cyan-300/10 bg-cyan-300/[.035] p-4 text-xs leading-5 text-zinc-400">
      <ShieldCheck className="mr-2 inline h-4 w-4 text-cyan-300"/>Blackstar can coach, organise and explain. It does not diagnose, prescribe, replace emergency care or change clinician-directed medication.
    </div>
    {error && <div className="mb-4 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</div>}
    <div className="mb-5 flex flex-wrap gap-2">{TABS.map(([id,label,Icon])=><button key={id} onClick={()=>setTab(id)} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${tab===id?'border-violet-300/25 bg-violet-400/10 text-violet-100':'border-white/[.07] bg-black/20 text-zinc-500 hover:text-zinc-300'}`}><Icon className="h-3.5 w-3.5"/>{label}</button>)}</div>

    {tab==='overview' && <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon={Target} label="Active goals" value={summary.activeGoals ?? 0}/>
        <Metric icon={Dumbbell} label="Workouts · 7 days" value={summary.workoutsLast7Days ?? 0}/>
        <Metric icon={Moon} label="Avg sleep · 7 days" value={summary.averageSleepHours == null ? '—' : `${summary.averageSleepHours}h`}/>
        <Metric icon={TrendingUp} label="Latest weight" value={summary.latestWeight ? `${summary.latestWeight.value} ${summary.latestWeight.unit}` : '—'}/>
        <Metric icon={Tablets} label="Active medications" value={summary.activeMedications ?? 0}/>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
        <Panel title="Health profile" icon={HeartPulse}>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Primary goal"><textarea className="hf-field min-h-20 resize-none" value={profile.goal} onChange={e=>setProfile({...profile,goal:e.target.value})}/></Field><Field label="Activity level"><select className="hf-field" value={profile.activity_level} onChange={e=>setProfile({...profile,activity_level:e.target.value})}>{['sedentary','light','moderate','active','very_active'].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Units"><select className="hf-field" value={profile.units} onChange={e=>setProfile({...profile,units:e.target.value})}><option value="metric">Metric</option><option value="imperial">Imperial</option></select></Field><Field label="Height (cm)"><input className="hf-field" type="number" value={profile.height_cm} onChange={e=>setProfile({...profile,height_cm:e.target.value})}/></Field><Field label="Date of birth"><input className="hf-field" type="date" value={profile.date_of_birth} onChange={e=>setProfile({...profile,date_of_birth:e.target.value})}/></Field><Field label="Dietary preferences"><input className="hf-field" value={profile.dietary_preferences} onChange={e=>setProfile({...profile,dietary_preferences:e.target.value})} placeholder="vegetarian, halal, high protein"/></Field><Field label="Allergies"><input className="hf-field" value={profile.allergies} onChange={e=>setProfile({...profile,allergies:e.target.value})} placeholder="comma-separated"/></Field><Field label="Conditions to consider"><input className="hf-field" value={profile.conditions} onChange={e=>setProfile({...profile,conditions:e.target.value})} placeholder="Only add what you want Blackstar to consider"/></Field></div>
          <Field label="Accessibility / training considerations" className="mt-3"><textarea className="hf-field min-h-20 resize-none" value={profile.accessibility_notes} onChange={e=>setProfile({...profile,accessibility_notes:e.target.value})}/></Field>
          <button onClick={saveProfile} disabled={busy==='profile'} className="hf-primary mt-3">{busy==='profile'?<Loader2 className="h-4 w-4 animate-spin"/>:<HeartPulse className="h-4 w-4"/>}Save private profile</button>
        </Panel>
        <Panel title="Goals" icon={Target}>
          <div className="space-y-2">{activeGoals.length?activeGoals.slice(0,8).map(item=><div key={item.id} className="rounded-xl border border-white/[.06] bg-black/20 p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs text-zinc-200">{item.title}</span><span className="text-[9px] uppercase tracking-wider text-violet-300">{item.category.replaceAll('_',' ')}</span></div>{item.target_value!=null&&<p className="mt-1 text-[10px] text-zinc-600">Target {item.target_value} {item.target_unit||''}{item.target_date?` · by ${item.target_date}`:''}</p>}</div>):<Empty text="No active goals yet."/>}</div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2"><Field label="Goal"><input className="hf-field" value={goal.title} onChange={e=>setGoal({...goal,title:e.target.value})}/></Field><Field label="Category"><select className="hf-field" value={goal.category} onChange={e=>setGoal({...goal,category:e.target.value})}>{['fitness','strength','cardio','mobility','nutrition','sleep','recovery','weight','habit','general_health'].map(x=><option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}</select></Field><Field label="Target value"><input className="hf-field" type="number" value={goal.target_value} onChange={e=>setGoal({...goal,target_value:e.target.value})}/></Field><Field label="Unit"><input className="hf-field" value={goal.target_unit} onChange={e=>setGoal({...goal,target_unit:e.target.value})}/></Field><Field label="Target date"><input className="hf-field" type="date" value={goal.target_date} onChange={e=>setGoal({...goal,target_date:e.target.value})}/></Field></div>
          <button onClick={addGoal} disabled={!goal.title.trim()||busy==='goal'} className="hf-primary mt-3"><Plus className="h-4 w-4"/>Add goal</button>
        </Panel>
      </div>
      <Panel title="Recent health metrics" icon={Activity}><MetricLedger rows={recentMetrics}/><MetricForm metric={metric} setMetric={setMetric} onAdd={addMetric} busy={busy}/></Panel>
    </div>}

    {tab==='fitness' && <div className="grid gap-4 xl:grid-cols-[.8fr_1.2fr]">
      <Panel title="Plan / log workout" icon={Dumbbell}>
        <div className="grid gap-3 sm:grid-cols-2"><Field label="Workout"><input className="hf-field" value={workout.name} onChange={e=>setWorkout({...workout,name:e.target.value})} placeholder="Upper body strength"/></Field><Field label="Type"><select className="hf-field" value={workout.workout_type} onChange={e=>setWorkout({...workout,workout_type:e.target.value})}>{['strength','cardio','mobility','sport','recovery','mixed','other'].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Date"><input className="hf-field" type="date" value={workout.scheduled_for} onChange={e=>setWorkout({...workout,scheduled_for:e.target.value})}/></Field><Field label="Duration (minutes)"><input className="hf-field" type="number" value={workout.duration_minutes} onChange={e=>setWorkout({...workout,duration_minutes:e.target.value})}/></Field><Field label="Exercise"><input className="hf-field" value={workout.exercise} onChange={e=>setWorkout({...workout,exercise:e.target.value})} placeholder="Bench press"/></Field><Field label="Sets"><input className="hf-field" type="number" value={workout.sets} onChange={e=>setWorkout({...workout,sets:e.target.value})}/></Field><Field label="Reps"><input className="hf-field" type="number" value={workout.reps} onChange={e=>setWorkout({...workout,reps:e.target.value})}/></Field><Field label="Load"><input className="hf-field" type="number" value={workout.weight} onChange={e=>setWorkout({...workout,weight:e.target.value})} placeholder="optional"/></Field></div>
        <button onClick={addWorkout} disabled={busy==='workout'||!workout.name.trim()||!workout.exercise.trim()} className="hf-primary mt-3"><Plus className="h-4 w-4"/>Add workout</button>
      </Panel>
      <Panel title="Workout history" icon={TrendingUp}><div className="space-y-2">{(data?.workouts??[]).length?(data?.workouts??[]).map(item=><div key={item.id} className="rounded-xl border border-white/[.06] bg-black/20 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-medium text-zinc-200">{item.name}</p><span className="text-[9px] text-zinc-600">{item.scheduled_for||'unscheduled'} · {item.workout_type}</span></div><p className="mt-2 text-[10px] text-zinc-500">{Array.isArray(item.exercises)?item.exercises.map(x=>`${x.name} · ${x.sets}×${x.reps??'—'}`).join(' · '):'Workout'}</p></div>):<Empty text="No workouts yet."/>}</div></Panel>
    </div>}

    {tab==='nutrition' && <div className="grid gap-4 xl:grid-cols-[.82fr_1.18fr]"><Panel title="Log food & hydration" icon={Salad}><div className="grid gap-3 sm:grid-cols-2"><Field label="Meal type"><select className="hf-field" value={meal.meal_type} onChange={e=>setMeal({...meal,meal_type:e.target.value})}>{['breakfast','lunch','dinner','snack','drink','meal'].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Food / meal"><input className="hf-field" value={meal.name} onChange={e=>setMeal({...meal,name:e.target.value})}/></Field>{[['calories','Calories'],['protein_g','Protein g'],['carbs_g','Carbs g'],['fat_g','Fat g'],['fibre_g','Fibre g'],['water_ml','Water ml']].map(([key,label])=><Field key={key} label={label}><input className="hf-field" type="number" min="0" value={meal[key]} onChange={e=>setMeal({...meal,[key]:e.target.value})}/></Field>)}</div><button onClick={addMeal} disabled={busy==='meal'||!meal.name.trim()} className="hf-primary mt-3"><Plus className="h-4 w-4"/>Log nutrition</button></Panel><Panel title="Recent nutrition" icon={Apple}><div className="space-y-2">{latestNutrition.length?latestNutrition.map(item=><div key={item.id} className="rounded-xl border border-white/[.06] bg-black/20 p-3"><div className="flex justify-between gap-3"><span className="text-xs text-zinc-200">{item.name}</span><span className="text-[9px] text-zinc-600">{item.meal_type}</span></div><p className="mt-1 text-[10px] text-zinc-500">{item.calories!=null?`${item.calories} kcal · `:''}{item.protein_g!=null?`P ${item.protein_g}g · `:''}{item.carbs_g!=null?`C ${item.carbs_g}g · `:''}{item.fat_g!=null?`F ${item.fat_g}g`:''}</p></div>):<Empty text="No nutrition entries yet."/>}</div></Panel></div>}

    {tab==='recovery' && <div className="grid gap-4 xl:grid-cols-[.8fr_1.2fr]"><Panel title="Log sleep" icon={Moon}><div className="space-y-3"><Field label="Sleep start"><input className="hf-field" type="datetime-local" value={sleep.sleep_start} onChange={e=>setSleep({...sleep,sleep_start:e.target.value})}/></Field><Field label="Sleep end"><input className="hf-field" type="datetime-local" value={sleep.sleep_end} onChange={e=>setSleep({...sleep,sleep_end:e.target.value})}/></Field><Field label="Quality (0-10)"><input className="hf-field" type="number" min="0" max="10" step=".5" value={sleep.quality} onChange={e=>setSleep({...sleep,quality:e.target.value})}/></Field><Field label="Awake minutes"><input className="hf-field" type="number" min="0" value={sleep.awake_minutes} onChange={e=>setSleep({...sleep,awake_minutes:e.target.value})}/></Field></div><button onClick={addSleep} disabled={busy==='sleep'} className="hf-primary mt-3"><Plus className="h-4 w-4"/>Log sleep</button></Panel><Panel title="Sleep history" icon={TrendingUp}><div className="space-y-2">{(data?.sleep??[]).length?(data?.sleep??[]).slice(0,20).map(item=>{const hours=Math.round(((new Date(item.sleep_end)-new Date(item.sleep_start))/3600000)*10)/10;return <div key={item.id} className="rounded-xl border border-white/[.06] bg-black/20 p-3"><div className="flex justify-between"><span className="text-xs text-zinc-200">{hours} hours</span><span className="text-[9px] text-zinc-600">{new Date(item.sleep_end).toLocaleDateString()}</span></div><p className="mt-1 text-[10px] text-zinc-500">Quality {item.quality??'—'}/10 · {item.source}</p></div>}):<Empty text="No sleep entries yet."/>}</div></Panel></div>}

    {tab==='plans' && <HealthPlansRecords />}

    {tab==='record' && <><div className="grid gap-4 xl:grid-cols-[.8fr_1.2fr]"><Panel title="Medication list" icon={Tablets}><p className="mb-3 text-[10px] leading-4 text-zinc-600">For record organisation only. Blackstar will not change prescribed medication or dosage.</p><div className="grid gap-3 sm:grid-cols-2"><Field label="Medication"><input className="hf-field" value={med.name} onChange={e=>setMed({...med,name:e.target.value})}/></Field><Field label="Dose"><input className="hf-field" value={med.dose} onChange={e=>setMed({...med,dose:e.target.value})}/></Field><Field label="Schedule"><input className="hf-field" value={med.schedule} onChange={e=>setMed({...med,schedule:e.target.value})}/></Field><Field label="Purpose"><input className="hf-field" value={med.purpose} onChange={e=>setMed({...med,purpose:e.target.value})}/></Field><Field label="Prescribed by"><input className="hf-field" value={med.prescribed_by} onChange={e=>setMed({...med,prescribed_by:e.target.value})}/></Field><Field label="Started"><input className="hf-field" type="date" value={med.started_on} onChange={e=>setMed({...med,started_on:e.target.value})}/></Field></div><button onClick={addMedication} disabled={busy==='med'||!med.name.trim()} className="hf-primary mt-3"><Plus className="h-4 w-4"/>Add to record</button></Panel><Panel title="Current record" icon={Stethoscope}><div className="space-y-2">{(data?.medications??[]).length?(data?.medications??[]).map(item=><div key={item.id} className="rounded-xl border border-white/[.06] bg-black/20 p-3"><div className="flex justify-between gap-3"><span className="text-xs text-zinc-200">{item.name}</span><span className={`text-[9px] uppercase ${item.active?'text-emerald-300':'text-zinc-600'}`}>{item.active?'active':'inactive'}</span></div><p className="mt-1 text-[10px] text-zinc-500">{[item.dose,item.schedule,item.purpose].filter(Boolean).join(' · ')||'No additional details'}</p></div>):<Empty text="No medications recorded."/>}</div></Panel></div><HealthPlansRecords mode="record" /></>}

    {tab==='coach' && <Panel title="Blackstar Health Coach" icon={Brain}><div className="rounded-xl border border-amber-300/10 bg-amber-300/[.025] p-3 text-[10px] leading-5 text-amber-100/70">For emergencies or immediate danger, contact local emergency services. The coach is for bounded health information, fitness, nutrition, recovery, organisation and appointment preparation.</div><div className="mt-4 min-h-72 max-h-[520px] overflow-auto rounded-xl border border-white/[.06] bg-black/20 p-3">{turns.length?turns.map((turn,index)=><div key={index} className={`mb-3 max-w-[88%] rounded-xl px-3 py-2 text-xs leading-5 ${turn.role==='user'?'ml-auto bg-violet-400/10 text-violet-100':'border border-white/[.06] bg-white/[.025] text-zinc-300'}`}><div className="mb-1 text-[8px] uppercase tracking-wider text-zinc-600">{turn.role==='user'?'You':'Blackstar'}</div>{turn.content}</div>):<div className="grid min-h-64 place-items-center text-center text-xs text-zinc-600">Ask about a workout plan, nutrition habits, sleep/recovery, your logged trends, questions to prepare for a clinician, or help understanding non-emergency health information.</div>}</div>{coachMeta&&<div className="mt-2 flex flex-wrap gap-2 text-[9px] text-zinc-600"><span>Mode: {coachMeta.mode}</span>{coachMeta.provider&&<span>{coachMeta.provider} · {coachMeta.model}</span>}</div>}<form onSubmit={askCoach} className="mt-3 flex gap-2"><textarea className="hf-field min-h-24 flex-1 resize-none" value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Ask Blackstar about your health & fitness goals…"/><button disabled={!question.trim()||busy==='coach'} className="hf-primary w-28 justify-center">{busy==='coach'?<Loader2 className="h-4 w-4 animate-spin"/>:<Sparkles className="h-4 w-4"/>}{busy==='coach'?'Thinking':'Ask'}</button></form></Panel>}

    <style>{`.hf-field{width:100%;border:1px solid rgba(255,255,255,.09);background:rgba(0,0,0,.28);border-radius:.75rem;padding:.62rem .72rem;font-size:.75rem;color:white;outline:none}.hf-field:focus{border-color:rgba(167,139,250,.42);box-shadow:0 0 0 3px rgba(139,92,246,.04)}.hf-field option{background:#11131a}.hf-primary{display:inline-flex;align-items:center;gap:.5rem;border-radius:.75rem;background:rgb(196 181 253);padding:.65rem .9rem;font-size:.75rem;font-weight:600;color:#050505}.hf-primary:disabled{opacity:.4}`}</style>
  </>;
}

function splitList(value){return String(value||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,100);}
function Field({label,className='',children}){return <label className={className}><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[.13em] text-zinc-600">{label}</span>{children}</label>}
function Panel({title,icon:Icon,children}){return <section className="rounded-[24px] border border-white/[.07] bg-white/[.025] p-4 sm:p-5"><div className="mb-4 flex items-center gap-2"><Icon className="h-4 w-4 text-violet-300"/><h2 className="text-sm font-semibold text-white">{title}</h2></div>{children}</section>}
function Metric({icon:Icon,label,value}){return <div className="rounded-2xl border border-white/[.07] bg-black/25 p-4"><Icon className="h-4 w-4 text-violet-300"/><div className="mt-3 text-xl font-semibold text-white">{value}</div><div className="mt-1 text-[9px] uppercase tracking-[.12em] text-zinc-600">{label}</div></div>}
function Empty({text}){return <div className="rounded-xl border border-dashed border-white/[.07] p-6 text-center text-xs text-zinc-600">{text}</div>}
function MetricLedger({rows}){return <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{rows.length?rows.map(item=><div key={item.id} className="rounded-xl border border-white/[.06] bg-black/20 p-3"><div className="flex justify-between gap-2"><span className="text-[10px] text-zinc-500">{item.metric_type.replaceAll('_',' ')}</span><span className="text-[9px] text-zinc-700">{new Date(item.recorded_at).toLocaleDateString()}</span></div><div className="mt-1 text-sm font-semibold text-zinc-200">{item.value} <span className="text-[10px] font-normal text-zinc-600">{item.unit}</span></div></div>):<Empty text="No health metrics yet."/>}</div>}
function MetricForm({metric,setMetric,onAdd,busy}){const units={weight:'kg',resting_heart_rate:'bpm',heart_rate:'bpm',hrv:'ms',steps:'steps',blood_pressure_systolic:'mmHg',blood_pressure_diastolic:'mmHg',blood_glucose:'mmol/L',body_fat:'%',waist:'cm',temperature:'°C',oxygen_saturation:'%',hydration:'ml',mood:'/10',energy:'/10',pain:'/10',other:'value'};return <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]"><select className="hf-field" value={metric.metric_type} onChange={e=>setMetric({...metric,metric_type:e.target.value,unit:units[e.target.value]||'value'})}>{Object.keys(units).map(x=><option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}</select><input className="hf-field" type="number" step="any" value={metric.value} onChange={e=>setMetric({...metric,value:e.target.value})} placeholder="Value"/><input className="hf-field" value={metric.unit} onChange={e=>setMetric({...metric,unit:e.target.value})}/><button onClick={onAdd} disabled={busy==='metric'||metric.value===''} className="hf-primary justify-center"><Plus className="h-4 w-4"/>Log</button></div>}
