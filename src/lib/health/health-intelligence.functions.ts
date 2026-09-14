import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { resolveAssistantModelPreference } from '@/lib/ai/ai-preferences.server';
import { runChat, type ChatMessage, type ToolDef } from '@/lib/runtime/model-gateway.server';
import { assertWithinLimit, EntitlementError, getEntitlements, recordUsage } from '@/lib/platform/entitlements.server';
import { writeAudit } from '@/lib/platform/audit.server';

type Sb = { from: (table: string) => any; rpc: (name: string, args?: Record<string, unknown>) => any };
const uuid=z.string().uuid();
const sourceType=z.enum(['csv','json','apple_health_export','health_connect_export','fitbit_export','garmin_export','oura_export','other']);
const metricType=z.enum(['weight','resting_heart_rate','heart_rate','hrv','steps','blood_pressure_systolic','blood_pressure_diastolic','blood_glucose','body_fat','waist','temperature','oxygen_saturation','hydration','mood','energy','pain','other']);
const iso=z.string().datetime({offset:true});

const metricRow=z.object({
  metric_type:metricType,
  value:z.number().finite(),
  unit:z.string().trim().min(1).max(32),
  recorded_at:iso,
  notes:z.string().trim().max(1000).optional(),
});
const sleepRow=z.object({
  sleep_start:iso,sleep_end:iso,
  quality:z.number().min(0).max(10).optional(),
  awake_minutes:z.number().int().min(0).max(1440).optional(),
}).refine(x=>new Date(x.sleep_end)>new Date(x.sleep_start),'sleep_end must be after sleep_start');

export const getHealthIntelligenceOverview=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .handler(async({context})=>{
    const sb=context.supabase as unknown as Sb;
    const since=new Date(Date.now()-90*86400000).toISOString();
    const [metrics,sleep,workouts,nutrition,imports,briefs]=await Promise.all([
      sb.from('health_metric_entries').select('id,metric_type,value,unit,recorded_at,source').eq('user_id',context.userId).gte('recorded_at',since).order('recorded_at',{ascending:true}).limit(1000),
      sb.from('health_sleep_entries').select('id,sleep_start,sleep_end,quality,source').eq('user_id',context.userId).gte('sleep_end',since).order('sleep_end',{ascending:true}).limit(180),
      sb.from('health_workouts').select('id,name,workout_type,scheduled_for,completed_at,duration_minutes,source').eq('user_id',context.userId).order('scheduled_for',{ascending:false}).limit(200),
      sb.from('health_nutrition_entries').select('id,eaten_at,calories,protein_g,water_ml').eq('user_id',context.userId).gte('eaten_at',since).order('eaten_at',{ascending:true}).limit(1000),
      sb.from('health_import_batches').select('*').eq('user_id',context.userId).order('created_at',{ascending:false}).limit(50),
      sb.from('health_appointment_briefs').select('*').eq('user_id',context.userId).order('updated_at',{ascending:false}).limit(50),
    ]);
    const failed=[metrics,sleep,workouts,nutrition,imports,briefs].find((x:any)=>x.error)?.error;
    if(failed)throw new Error(failed.message);
    return {metrics:metrics.data??[],sleep:sleep.data??[],workouts:workouts.data??[],nutrition:nutrition.data??[],imports:imports.data??[],briefs:briefs.data??[]};
  });

export const importHealthRows=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((value:unknown)=>z.object({
    source_type:sourceType,
    filename:z.string().trim().max(240).optional().or(z.literal('')),
    data_type:z.enum(['metrics','sleep']),
    rows:z.array(z.unknown()).min(1).max(500),
  }).parse(value))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    const parsed:any[]=[]; const rejected:Array<{index:number;reason:string}>=[];
    const schema=data.data_type==='metrics'?metricRow:sleepRow;
    data.rows.forEach((row,index)=>{const result=schema.safeParse(row);if(result.success)parsed.push(result.data);else rejected.push({index,reason:result.error.issues[0]?.message??'invalid row'});});
    const {data:batch,error:batchError}=await sb.from('health_import_batches').insert({
      user_id:context.userId,source_type:data.source_type,status:parsed.length?'validated':'failed',filename:data.filename||null,
      imported_rows:0,rejected_rows:rejected.length,summary:{data_type:data.data_type,submitted_rows:data.rows.length,valid_rows:parsed.length},error_details:rejected.slice(0,100),
    }).select('*').single();
    if(batchError)throw new Error(batchError.message);
    if(!parsed.length)return {batch_id:String(batch.id),status:'failed',imported_rows:0,rejected_rows:rejected.length};

    const table=data.data_type==='metrics'?'health_metric_entries':'health_sleep_entries';
    const rows=parsed.map(row=>data.data_type==='metrics'
      ?{...row,user_id:context.userId,source:'import',metadata:{import_batch_id:batch.id,source_type:data.source_type}}
      :{...row,user_id:context.userId,source:'import',metadata:{import_batch_id:batch.id,source_type:data.source_type}});
    const {error:insertError}=await sb.from(table).insert(rows);
    if(insertError){
      await sb.from('health_import_batches').update({status:'failed',error_details:[...rejected,{index:-1,reason:insertError.message}],completed_at:new Date().toISOString()}).eq('id',batch.id).eq('user_id',context.userId);
      throw new Error(insertError.message);
    }
    const {error:updateError}=await sb.from('health_import_batches').update({
      status:'imported',imported_rows:parsed.length,rejected_rows:rejected.length,completed_at:new Date().toISOString(),
    }).eq('id',batch.id).eq('user_id',context.userId);
    if(updateError)throw new Error(updateError.message);
    await writeAudit({userId:context.userId,action:'health.import.completed',targetType:'health_import_batch',targetId:batch.id,status:'success',metadata:{sourceType:data.source_type,dataType:data.data_type,importedRows:parsed.length,rejectedRows:rejected.length}});
    return {batch_id:String(batch.id),status:'imported',imported_rows:parsed.length,rejected_rows:rejected.length};
  });

const briefSchema=z.object({
  summary:z.string().trim().min(1).max(5000),
  recent_changes:z.array(z.string().trim().min(1).max(800)).max(20).default([]),
  medications_to_confirm:z.array(z.string().trim().min(1).max(500)).max(50).default([]),
  records_to_discuss:z.array(z.string().trim().min(1).max(1000)).max(30).default([]),
  questions:z.array(z.string().trim().min(1).max(700)).max(30).default([]),
  red_flags_for_clinician:z.array(z.string().trim().min(1).max(700)).max(20).default([]),
});
const briefTool:ToolDef={name:'draft_appointment_brief',description:'Create a non-diagnostic appointment-preparation brief from user-owned records. Do not diagnose or recommend medication changes.',parameters:{type:'object',additionalProperties:false,required:['summary','recent_changes','medications_to_confirm','records_to_discuss','questions','red_flags_for_clinician'],properties:{summary:{type:'string'},recent_changes:{type:'array',items:{type:'string'}},medications_to_confirm:{type:'array',items:{type:'string'}},records_to_discuss:{type:'array',items:{type:'string'}},questions:{type:'array',items:{type:'string'}},red_flags_for_clinician:{type:'array',items:{type:'string'}}}}};

export const generateHealthAppointmentBrief=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((value:unknown)=>z.object({
    title:z.string().trim().min(1).max(200),
    appointment_date:z.string().date().optional().or(z.literal('')),
    clinician_or_service:z.string().trim().max(240).optional().or(z.literal('')),
    goals:z.string().trim().min(1).max(4000),
    questions:z.array(z.string().trim().min(1).max(700)).max(20).optional().default([]),
  }).parse(value))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    try{const entitlements=await getEntitlements(sb,context.userId);assertWithinLimit(entitlements,'tasks_per_month');}
    catch(error){if(error instanceof EntitlementError)throw new Error(error.message);throw error;}
    const [profile,medications,records,metrics,sleep,preference]=await Promise.all([
      sb.from('health_profiles').select('goal,allergies,conditions,accessibility_notes').eq('user_id',context.userId).maybeSingle(),
      sb.from('health_medications').select('name,dose,schedule,purpose,active').eq('user_id',context.userId).eq('active',true).limit(100),
      sb.from('health_records').select('record_type,title,recorded_on,provider,summary,values').eq('user_id',context.userId).order('recorded_on',{ascending:false}).limit(80),
      sb.from('health_metric_entries').select('metric_type,value,unit,recorded_at').eq('user_id',context.userId).order('recorded_at',{ascending:false}).limit(60),
      sb.from('health_sleep_entries').select('sleep_start,sleep_end,quality').eq('user_id',context.userId).order('sleep_end',{ascending:false}).limit(14),
      sb.from('user_ai_preferences').select('default_provider,default_model').eq('user_id',context.userId).maybeSingle(),
    ]);
    const failed=[profile,medications,records,metrics,sleep].find((x:any)=>x.error)?.error;if(failed)throw new Error(failed.message);
    const {provider,model}=resolveAssistantModelPreference(preference.error?null:preference.data);
    const contextPayload={profile:profile.data??null,active_medications:medications.data??[],recent_records:records.data??[],recent_metrics:metrics.data??[],recent_sleep:sleep.data??[],appointment_goal:data.goals,user_questions:data.questions};
    const messages:ChatMessage[]=[
      {role:'system',content:'You are Blackstar Appointment Prep. Organize user-owned health information into a concise, non-diagnostic brief for a clinician. Do not diagnose, prescribe, recommend starting/stopping/changing medication, or claim a record means a specific disease. Distinguish recorded facts from questions. If an item may be urgent, put it under red_flags_for_clinician without diagnosing it. Use draft_appointment_brief exactly once.'},
      {role:'system',content:`USER-OWNED HEALTH CONTEXT\n${JSON.stringify(contextPayload).slice(0,24000)}`},
      {role:'user',content:`Prepare a brief titled "${data.title}" for ${data.clinician_or_service||'my clinician'}. My purpose: ${data.goals}`},
    ];
    const result=await runChat({provider,model,messages,tools:[briefTool],temperature:0.1,maxTokens:1500});
    const call=result.toolCalls.find(x=>x.name===briefTool.name);
    if(!call)throw new Error('Appointment brief generator did not return a structured draft.');
    const brief=briefSchema.parse(call.arguments);
    const {data:row,error}=await sb.from('health_appointment_briefs').insert({
      user_id:context.userId,title:data.title,appointment_date:data.appointment_date||null,clinician_or_service:data.clinician_or_service||null,
      questions:data.questions,brief,status:'draft',ai_provider:result.provider,ai_model:result.model,
    }).select('*').single();
    if(error)throw new Error(error.message);
    await recordUsage({userId:context.userId,metric:'assistant_message',quantity:1,metadata:{surface:'health_appointment_prep',provider:result.provider,model:result.model,input_tokens:result.usage.input,output_tokens:result.usage.output}});
    await writeAudit({userId:context.userId,action:'health.appointment_brief_generated',targetType:'health_appointment_brief',targetId:row.id,status:'success',metadata:{provider:result.provider,model:result.model}});
    return row;
  });

export const setHealthAppointmentBriefStatus=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((value:unknown)=>z.object({id:uuid,status:z.enum(['draft','ready','archived'])}).parse(value))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    const {data:row,error}=await sb.from('health_appointment_briefs').update({status:data.status,updated_at:new Date().toISOString()}).eq('id',data.id).eq('user_id',context.userId).select('*').single();
    if(error)throw new Error(error.message);return row;
  });
