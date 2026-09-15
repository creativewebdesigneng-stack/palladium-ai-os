import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

type Sb={from:(table:string)=>any};
const DAY=86400000;
const num=(v:unknown)=>Number(v);
const time=(v:unknown)=>new Date(String(v)).getTime();
const round=(v:number,d=1)=>Number(v.toFixed(d));
const average=(xs:number[])=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;

function metricTrend(rows:any[],type:string){
 const xs=rows.filter(x=>x.metric_type===type).sort((a,b)=>time(a.recorded_at)-time(b.recorded_at));
 if(xs.length<2)return null;
 const first=num(xs[0].value),last=num(xs[xs.length-1].value);
 return {first,last,change:round(last-first,2),unit:String(xs[xs.length-1].unit),points:xs.slice(-30).map(x=>({at:x.recorded_at,value:num(x.value)}))};
}

export const getHealthAnalytics=createServerFn({method:'POST'})
.middleware([requireSupabaseAuth])
.handler(async({context})=>{
 const sb=context.supabase as unknown as Sb;
 const since90=new Date(Date.now()-90*DAY).toISOString();
 const [goals,metrics,workouts,nutrition,sleep]=await Promise.all([
  sb.from('health_goals').select('id,title,category,target_value,target_unit,status').eq('user_id',context.userId).eq('status','active').limit(100),
  sb.from('health_metric_entries').select('metric_type,value,unit,recorded_at').eq('user_id',context.userId).gte('recorded_at',since90).order('recorded_at',{ascending:true}).limit(2000),
  sb.from('health_workouts').select('workout_type,completed_at,duration_minutes,perceived_exertion').eq('user_id',context.userId).gte('created_at',since90).order('created_at',{ascending:true}).limit(500),
  sb.from('health_nutrition_entries').select('eaten_at,protein_g').eq('user_id',context.userId).gte('eaten_at',since90).order('eaten_at',{ascending:true}).limit(3000),
  sb.from('health_sleep_entries').select('sleep_start,sleep_end,quality').eq('user_id',context.userId).gte('sleep_end',since90).order('sleep_end',{ascending:true}).limit(500),
 ]);
 const failed=[goals,metrics,workouts,nutrition,sleep].find((r:any)=>r.error)?.error;
 if(failed)throw new Error(failed.message);
 const now=Date.now(),d7=now-7*DAY,d30=now-30*DAY;
 const metricRows=metrics.data??[],workoutRows=workouts.data??[],sleepRows=sleep.data??[],foodRows=nutrition.data??[];
 const completed=workoutRows.filter((x:any)=>x.completed_at);
 const workouts7=completed.filter((x:any)=>time(x.completed_at)>=d7);
 const workouts30=completed.filter((x:any)=>time(x.completed_at)>=d30);
 const sleep7=sleepRows.filter((x:any)=>time(x.sleep_end)>=d7);
 const sleepHours=sleep7.map((x:any)=>(time(x.sleep_end)-time(x.sleep_start))/3600000);
 const qualities=sleep7.filter((x:any)=>x.quality!=null).map((x:any)=>num(x.quality));
 const food7=foodRows.filter((x:any)=>time(x.eaten_at)>=d7);
 const proteinByDay=new Map<string,number>();
 for(const x of food7){const day=new Date(x.eaten_at).toISOString().slice(0,10);proteinByDay.set(day,(proteinByDay.get(day)||0)+num(x.protein_g||0));}
 const observations:string[]=[];
 const avgSleep=average(sleepHours);
 if(avgSleep!=null&&avgSleep<7)observations.push('Logged sleep averaged under 7 hours over the last 7 days. This describes your logs only; it is not a diagnosis.');
 if(workouts7.length>=5&&avgSleep!=null&&avgSleep<7)observations.push('Five or more completed workouts overlap with shorter logged sleep this week. This is an overlap, not evidence that one caused the other.');
 if(food7.length>0&&proteinByDay.size<4)observations.push('Nutrition was logged on fewer than four days this week, so nutrition averages may not represent your full intake.');
 return {
  training:{workouts7:workouts7.length,workouts30:workouts30.length,durationMinutes30:workouts30.reduce((s:number,x:any)=>s+num(x.duration_minutes||0),0),load30:round(workouts30.reduce((s:number,x:any)=>s+num(x.duration_minutes||0)*num(x.perceived_exertion||0),0),0)},
  recovery:{averageSleepHours7:avgSleep==null?null:round(avgSleep),averageQuality7:qualities.length?round(average(qualities)!):null,nights7:sleep7.length},
  nutrition:{loggedDays7:proteinByDay.size,entries7:food7.length,averageProteinLoggedDay7:proteinByDay.size?round(average([...proteinByDay.values()])!):null},
  trends:{weight:metricTrend(metricRows,'weight'),restingHeartRate:metricTrend(metricRows,'resting_heart_rate'),hrv:metricTrend(metricRows,'hrv'),steps:metricTrend(metricRows,'steps')},
  goals:goals.data??[],observations,
 };
});
