import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { resolveAssistantModelPreference } from '@/lib/ai/ai-preferences.server';
import { runChat, type ChatMessage, type ToolDef } from '@/lib/runtime/model-gateway.server';
import { assertWithinLimit, EntitlementError, getEntitlements, recordUsage } from '@/lib/platform/entitlements.server';
import { writeAudit } from '@/lib/platform/audit.server';

type Sb = { from: (table: string) => any; rpc: (name: string, args?: Record<string, unknown>) => any };
const optionalText=(max:number)=>z.string().trim().max(max).optional().or(z.literal(''));

const planInput=z.object({
  plan_type:z.enum(['training','nutrition','sleep','recovery','habit']),
  request:z.string().trim().min(1).max(4000),
});
const structuredPlan=z.object({
  title:z.string().trim().min(1).max(180),
  summary:z.string().trim().min(1).max(3000),
  principles:z.array(z.string().trim().min(1).max(500)).max(20).default([]),
  schedule:z.array(z.object({
    label:z.string().trim().min(1).max(160),
    details:z.string().trim().min(1).max(2000),
  })).max(30).default([]),
  cautions:z.array(z.string().trim().min(1).max(700)).max(20).default([]),
});

const planTool:ToolDef={
  name:'draft_health_plan',
  description:'Return a conservative structured health, fitness, nutrition, sleep, recovery or habit plan. This creates a draft only; never diagnose or prescribe.',
  parameters:{
    type:'object',additionalProperties:false,required:['title','summary','principles','schedule','cautions'],
    properties:{
      title:{type:'string',maxLength:180},
      summary:{type:'string',maxLength:3000},
      principles:{type:'array',items:{type:'string'}},
      schedule:{type:'array',items:{type:'object',additionalProperties:false,required:['label','details'],properties:{label:{type:'string'},details:{type:'string'}}}},
      cautions:{type:'array',items:{type:'string'}},
    },
  },
};

const PLAN_SYSTEM=[
  'You are Blackstar Health Planner, a bounded health-information and fitness planning assistant.',
  'Create practical conservative plans for fitness, nutrition, sleep, recovery or habits using only user-owned context supplied by the server.',
  'Do not diagnose, prescribe, change medication, provide extreme dieting, dehydration, unsafe fasting, dangerous weight loss or training through serious injury.',
  'If stored conditions, allergies, accessibility needs or medications materially affect the request, keep the plan general and include an explicit caution to confirm significant changes with a qualified clinician, dietitian, pharmacist or physiotherapist as appropriate.',
  'For nutrition plans, respect stated allergies and dietary preferences. Never promise treatment of disease.',
  'For training plans, include progressive but reasonable workload, rest and recovery. Do not infer medical clearance.',
  'Use draft_health_plan exactly once to return the structured draft.',
].join(' ');

function json(value:unknown,max=12000){try{return JSON.stringify(value).slice(0,max);}catch{return '{}';}}
function nullify(value?:string){return value?.trim()?value.trim():null;}

export const getHealthPlansRecords=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .handler(async({context})=>{
    const sb=context.supabase as unknown as Sb;
    const [plans,records]=await Promise.all([
      sb.from('health_plans').select('*').eq('user_id',context.userId).order('updated_at',{ascending:false}).limit(100),
      sb.from('health_records').select('*').eq('user_id',context.userId).order('recorded_on',{ascending:false}).order('created_at',{ascending:false}).limit(200),
    ]);
    if(plans.error)throw new Error(plans.error.message);
    if(records.error)throw new Error(records.error.message);
    return{plans:plans.data??[],records:records.data??[]};
  });

export const generateHealthPlan=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((value:unknown)=>planInput.parse(value))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    try{
      const entitlements=await getEntitlements(sb,context.userId);
      assertWithinLimit(entitlements,'tasks_per_month');
    }catch(error){if(error instanceof EntitlementError)throw new Error(error.message);throw error;}

    const [profile,goals,metrics,workouts,nutrition,sleep,preference]=await Promise.all([
      sb.from('health_profiles').select('goal,units,activity_level,height_cm,dietary_preferences,allergies,conditions,accessibility_notes').eq('user_id',context.userId).maybeSingle(),
      sb.from('health_goals').select('category,title,target_value,target_unit,target_date').eq('user_id',context.userId).eq('status','active').limit(20),
      sb.from('health_metric_entries').select('metric_type,value,unit,recorded_at').eq('user_id',context.userId).order('recorded_at',{ascending:false}).limit(30),
      sb.from('health_workouts').select('name,workout_type,scheduled_for,completed_at,duration_minutes,perceived_exertion,exercises').eq('user_id',context.userId).order('scheduled_for',{ascending:false}).limit(15),
      sb.from('health_nutrition_entries').select('eaten_at,meal_type,name,calories,protein_g,carbs_g,fat_g,fibre_g,water_ml').eq('user_id',context.userId).order('eaten_at',{ascending:false}).limit(30),
      sb.from('health_sleep_entries').select('sleep_start,sleep_end,quality,awake_minutes').eq('user_id',context.userId).order('sleep_end',{ascending:false}).limit(10),
      sb.from('user_ai_preferences').select('default_provider,default_model').eq('user_id',context.userId).maybeSingle(),
    ]);
    const failed=[profile,goals,metrics,workouts,nutrition,sleep].find((result:any)=>result.error)?.error;
    if(failed)throw new Error(failed.message);
    const {provider,model,source:preferenceSource}=resolveAssistantModelPreference(preference.error?null:preference.data);
    const personalContext={profile:profile.data??null,active_goals:goals.data??[],recent_metrics:metrics.data??[],recent_workouts:workouts.data??[],recent_nutrition:nutrition.data??[],recent_sleep:sleep.data??[]};
    const messages:ChatMessage[]=[
      {role:'system',content:PLAN_SYSTEM},
      {role:'system',content:`PERSONAL HEALTH CONTEXT\n${json(personalContext)}`},
      {role:'user',content:`Plan type: ${data.plan_type}. Request: ${data.request}`},
    ];
    const result=await runChat({provider,model,messages,tools:[planTool],temperature:0.15,maxTokens:1400});
    const call=result.toolCalls.find((item)=>item.name===planTool.name);
    let draft;
    if(call){
      draft=structuredPlan.parse(call.arguments);
    }else{
      const fallback=result.text.trim();
      if(!fallback)throw new Error('Health planner did not return a usable draft.');
      draft=structuredPlan.parse({title:`${data.plan_type.charAt(0).toUpperCase()}${data.plan_type.slice(1)} plan`,summary:fallback,principles:[],schedule:[],cautions:['Review this draft before following it and seek qualified professional input for medical concerns.']});
    }
    const {data:row,error}=await sb.from('health_plans').insert({
      user_id:context.userId,plan_type:data.plan_type,title:draft.title,status:'draft',plan:draft,source:'ai',ai_provider:result.provider,ai_model:result.model,
    }).select('*').single();
    if(error)throw new Error(error.message);
    await recordUsage({userId:context.userId,metric:'assistant_message',quantity:1,metadata:{surface:'health_plan_generator',provider:result.provider,model:result.model,preference_source:preferenceSource,input_tokens:result.usage.input,output_tokens:result.usage.output}});
    await writeAudit({userId:context.userId,action:'health.plan_generated',targetType:'health_plan',targetId:row.id,status:'success',metadata:{planType:data.plan_type,provider:result.provider,model:result.model}});
    return row;
  });

export const setHealthPlanStatus=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((value:unknown)=>z.object({id:z.string().uuid(),status:z.enum(['draft','active','completed','archived'])}).parse(value))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    const {data:row,error}=await sb.from('health_plans').update({status:data.status,updated_at:new Date().toISOString()}).eq('id',data.id).eq('user_id',context.userId).select('*').single();
    if(error)throw new Error(error.message);
    return row;
  });

export const saveHealthRecord=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((value:unknown)=>z.object({
    record_type:z.enum(['lab','appointment','vaccination','procedure','diagnosis_record','note','document']),
    title:z.string().trim().min(1).max(240),
    recorded_on:z.string().date().optional().or(z.literal('')),
    provider:optionalText(240),summary:optionalText(5000),
    values:z.record(z.string(),z.union([z.string(),z.number(),z.boolean()])).optional().default({}),
  }).parse(value))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    const {data:row,error}=await sb.from('health_records').insert({
      user_id:context.userId,record_type:data.record_type,title:data.title,recorded_on:nullify(data.recorded_on),
      provider:nullify(data.provider),summary:nullify(data.summary),values:data.values,source:'manual',
    }).select('*').single();
    if(error)throw new Error(error.message);
    await writeAudit({userId:context.userId,action:'health.record_added',targetType:'health_record',targetId:row.id,status:'success',metadata:{recordType:data.record_type}});
    return row;
  });
