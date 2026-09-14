import { Activity, BookOpenCheck, ExternalLink, HeartPulse, Link2, ShieldCheck, Sparkles, Stethoscope, Watch } from 'lucide-react';

const SOURCES=[
  {
    group:'Movement & fitness',title:'NHS physical activity guidelines for adults',publisher:'NHS',
    href:'https://www.nhs.uk/live-well/exercise/physical-activity-guidelines-for-adults-aged-19-to-64/',
    note:'UK guidance on aerobic activity, strength work and reducing sedentary time.'
  },
  {
    group:'Movement & fitness',title:'WHO physical activity fact sheet',publisher:'World Health Organization',
    href:'https://www.who.int/news-room/fact-sheets/detail/physical-activity',
    note:'Global evidence-based overview of physical activity, sedentary behaviour and health.'
  },
  {
    group:'Nutrition',title:'The Eatwell Guide',publisher:'NHS',
    href:'https://www.nhs.uk/live-well/eat-well/food-guidelines-and-food-labels/the-eatwell-guide/',
    note:'UK healthy-eating framework for a balanced overall diet.'
  },
  {
    group:'Nutrition',title:'Vitamins and minerals',publisher:'NHS',
    href:'https://www.nhs.uk/conditions/vitamins-and-minerals/',
    note:'Reference information on common vitamins and minerals, food sources and intake considerations.'
  },
  {
    group:'Sleep & recovery',title:'Sleep and tiredness',publisher:'NHS',
    href:'https://www.nhs.uk/live-well/sleep-and-tiredness/',
    note:'NHS information on sleep, tiredness and practical self-care.'
  },
  {
    group:'Professional guidance',title:'Physical activity: brief advice for adults',publisher:'NICE',
    href:'https://www.nice.org.uk/guidance/ph44',
    note:'NICE guidance for tailoring physical-activity advice to needs, ability and health status.'
  },
  {
    group:'Professional guidance',title:'Physical activity and diet in overweight and obesity management',publisher:'NICE',
    href:'https://www.nice.org.uk/guidance/ng246/chapter/Physical-activity-and-diet',
    note:'NICE recommendations on physical activity and diet within weight-management care.'
  },
];

const CAPABILITIES=[
  ['Personal profile & goals','ready','Private goals, preferences, allergies, conditions and accessibility context.'],
  ['Workout planning & tracking','ready','Strength, cardio, mobility, sport, recovery and mixed sessions.'],
  ['Nutrition & hydration logging','ready','Meals, calories, macros, fibre, hydration and dietary preferences.'],
  ['Sleep & recovery','ready','Sleep duration, quality and longitudinal recovery context.'],
  ['Health metrics & trends','ready','Weight, heart rate, HRV, steps, blood pressure, glucose, body composition and more.'],
  ['AI Health Coach','ready','Bounded coaching, education, planning and record-aware explanations with emergency preflight.'],
  ['AI plan studio','ready','Structured training, nutrition, sleep, recovery and habit drafts with explicit activation.'],
  ['Medication & personal record','ready','Private organisation of medications, labs, appointments, vaccinations, procedures and notes.'],
  ['Clinician appointment prep','ready','Non-diagnostic summaries, questions and records to discuss with a professional.'],
  ['Wearable/export imports','ready','Validated import provenance for Apple Health, Health Connect, Fitbit, Garmin, Oura and generic JSON/CSV exports.'],
  ['Live Apple Health connection','external','Requires an authorised Apple/device integration; Blackstar does not claim this connection is live.'],
  ['Live Fitbit/Garmin/Oura sync','external','Requires provider OAuth/API credentials and user authorisation before live synchronization can be enabled.'],
  ['Medical-record provider sync','external','Requires a supported healthcare-record connector and explicit user authorisation.'],
];

export default function HealthKnowledge() {
  return <div className="space-y-5">
    <section className="rounded-[24px] border border-white/[.07] bg-white/[.025] p-4 sm:p-5">
      <div className="flex items-start gap-3"><BookOpenCheck className="mt-0.5 h-5 w-5 text-violet-300"/><div><h2 className="text-sm font-semibold text-white">Authoritative health & fitness knowledge</h2><p className="mt-1 max-w-3xl text-[10px] leading-5 text-zinc-600">Blackstar separates personal coaching from authoritative reference material. These links point to official NHS, WHO and NICE guidance and are shown with publisher provenance.</p></div></div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">{SOURCES.map(source=><a key={source.href} href={source.href} target="_blank" rel="noreferrer" className="group rounded-2xl border border-white/[.06] bg-black/20 p-4 hover:border-violet-300/20 hover:bg-violet-400/[.035]"><div className="flex items-start justify-between gap-3"><div><div className="text-[9px] font-semibold uppercase tracking-[.14em] text-violet-300/70">{source.group} · {source.publisher}</div><h3 className="mt-1 text-xs font-medium text-zinc-200">{source.title}</h3></div><ExternalLink className="h-3.5 w-3.5 text-zinc-700 group-hover:text-violet-300"/></div><p className="mt-2 text-[10px] leading-5 text-zinc-600">{source.note}</p></a>)}</div>
      <div className="mt-4 rounded-xl border border-cyan-300/10 bg-cyan-300/[.025] p-3 text-[10px] leading-5 text-zinc-500"><ShieldCheck className="mr-2 inline h-4 w-4 text-cyan-300"/>Reference links are educational resources. For urgent symptoms or immediate danger, use local emergency services rather than relying on a knowledge page or AI response.</div>
    </section>

    <section className="rounded-[24px] border border-white/[.07] bg-white/[.025] p-4 sm:p-5">
      <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-300"/><h2 className="text-sm font-semibold text-white">What Blackstar can help with</h2></div>
      <div className="mt-4 grid gap-2 lg:grid-cols-2">{CAPABILITIES.map(([name,status,description])=><div key={name} className="rounded-xl border border-white/[.06] bg-black/20 p-3"><div className="flex items-center justify-between gap-3"><p className="text-xs font-medium text-zinc-200">{name}</p><span className={`rounded-full border px-2 py-1 text-[8px] uppercase tracking-wider ${status==='ready'?'border-emerald-300/15 bg-emerald-300/[.04] text-emerald-300':'border-amber-300/15 bg-amber-300/[.04] text-amber-300'}`}>{status==='ready'?'available':'provider required'}</span></div><p className="mt-1 text-[10px] leading-5 text-zinc-600">{description}</p></div>)}</div>
    </section>

    <section className="grid gap-3 md:grid-cols-4">
      <Mini icon={Activity} title="Fitness" text="Plan, log and review training."/>
      <Mini icon={HeartPulse} title="Wellness" text="Track sleep, recovery and trends."/>
      <Mini icon={Stethoscope} title="Health information" text="Organise records and prepare for care."/>
      <Mini icon={Watch} title="Connected data" text="Import now; connect live providers only when authorised."/>
    </section>
  </div>;
}
function Mini({icon:Icon,title,text}){return <div className="rounded-2xl border border-white/[.06] bg-black/20 p-4"><Icon className="h-4 w-4 text-violet-300"/><p className="mt-3 text-xs font-medium text-zinc-200">{title}</p><p className="mt-1 text-[10px] leading-4 text-zinc-600">{text}</p></div>}
