import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
type Sb={from:(t:string)=>any};
const item=z.object({
 id:z.string().uuid().optional(), name:z.string().trim().min(1).max(120), industry:z.string().trim().min(1).max(120),
 geography:z.string().trim().max(160).optional(), organisation_context:z.string().trim().max(4000).optional(),
 objectives:z.string().trim().max(4000).optional(), notes:z.string().trim().max(8000).optional()
});
export const listIndustryWorkspaces=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{const sb=context.supabase as unknown as Sb;const {data,error}=await sb.from('industry_workspaces').select('*').order('updated_at',{ascending:false});if(error)throw new Error(error.message);return data??[];});
export const saveIndustryWorkspace=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>item.parse(v)).handler(async({data,context})=>{const sb=context.supabase as unknown as Sb;const row={name:data.name,industry:data.industry,geography:data.geography||null,organisation_context:data.organisation_context||null,objectives:data.objectives||null,notes:data.notes||null,updated_at:new Date().toISOString()};if(data.id){const {data:out,error}=await sb.from('industry_workspaces').update(row).eq('id',data.id).select().single();if(error)throw new Error(error.message);return out;}const {data:out,error}=await sb.from('industry_workspaces').insert({...row,user_id:context.userId}).select().single();if(error)throw new Error(error.message);return out;});
export const deleteIndustryWorkspace=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>z.object({id:z.string().uuid()}).parse(v)).handler(async({data,context})=>{const sb=context.supabase as unknown as Sb;const {error}=await sb.from('industry_workspaces').delete().eq('id',data.id);if(error)throw new Error(error.message);return{ok:true};});
