import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
type Sb={from:(t:string)=>any};
const stages=['start','build','grow','optimise','expand','transform'] as const;
const workspace=z.object({
 id:z.string().uuid().optional(),
 name:z.string().trim().min(1).max(160),
 industry:z.string().trim().max(160).optional(),
 stage:z.enum(stages).optional(),
 geography:z.string().trim().max(200).optional(),
 mission:z.string().trim().max(4000).optional(),
 company_context:z.string().trim().max(8000).optional(),
 objectives:z.array(z.string().trim().min(1).max(500)).max(50).default([]),
 priorities:z.array(z.string().trim().min(1).max(500)).max(50).default([]),
 risks:z.array(z.string().trim().min(1).max(500)).max(50).default([]),
 department_plan:z.record(z.string(),z.unknown()).default({}),
 ai_workforce_plan:z.array(z.record(z.string(),z.unknown())).max(100).default([]),
 notes:z.string().trim().max(12000).optional(),
});
export const listCompanyWorkspaces=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const sb=context.supabase as unknown as Sb; const {data,error}=await sb.from('company_workspaces').select('*').order('updated_at',{ascending:false}); if(error)throw new Error(error.message); return data??[];
});
export const saveCompanyWorkspace=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>workspace.parse(v)).handler(async({data,context})=>{
 const sb=context.supabase as unknown as Sb;
 const row={name:data.name,industry:data.industry||null,stage:data.stage||null,geography:data.geography||null,mission:data.mission||null,company_context:data.company_context||null,objectives:data.objectives,priorities:data.priorities,risks:data.risks,department_plan:data.department_plan,ai_workforce_plan:data.ai_workforce_plan,notes:data.notes||null,updated_at:new Date().toISOString()};
 if(data.id){const {data:out,error}=await sb.from('company_workspaces').update(row).eq('id',data.id).select().single();if(error)throw new Error(error.message);return out;}
 const {data:out,error}=await sb.from('company_workspaces').insert({...row,user_id:context.userId}).select().single();if(error)throw new Error(error.message);return out;
});
export const deleteCompanyWorkspace=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>z.object({id:z.string().uuid()}).parse(v)).handler(async({data,context})=>{
 const sb=context.supabase as unknown as Sb; const {error}=await sb.from('company_workspaces').delete().eq('id',data.id); if(error)throw new Error(error.message); return {ok:true};
});
