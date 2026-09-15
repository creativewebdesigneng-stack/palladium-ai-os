import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { writeAudit } from '@/lib/platform/audit.server';
type Sb={from:(table:string)=>any};
const TABLES=['health_profiles','health_goals','health_metric_entries','health_workouts','health_nutrition_entries','health_sleep_entries','health_medications','health_plans','health_records','health_import_batches','health_appointment_briefs','health_reminders'] as const;
export const exportHealthData=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const sb=context.supabase as unknown as Sb;const data:Record<string,any[]>={};
 for(const table of TABLES){const {data:rows,error}=await sb.from(table).select('*').eq('user_id',context.userId).limit(10000);if(error)throw new Error(error.message);data[table]=rows??[];}
 await writeAudit({userId:context.userId,action:'health.data_exported',targetType:'health_workspace',targetId:context.userId,status:'success'});
 return{exported_at:new Date().toISOString(),format:'blackstar-health-json-v1',data};
});
export const deleteHealthWorkspace=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>z.object({confirmation:z.literal('DELETE MY HEALTH DATA')}).parse(v)).handler(async({context})=>{
 const sb=context.supabase as unknown as Sb;
 for(const table of [...TABLES].reverse()){const {error}=await sb.from(table).delete().eq('user_id',context.userId);if(error)throw new Error(error.message);}
 await writeAudit({userId:context.userId,action:'health.workspace_deleted',targetType:'health_workspace',targetId:context.userId,status:'success'});
 return{deleted:true};
});