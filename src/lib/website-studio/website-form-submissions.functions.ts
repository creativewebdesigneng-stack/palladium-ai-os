import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';

type Sb={from:(table:string)=>any};
const statusSchema=z.enum(['new','reviewed','archived','spam']);

export const listWebsiteStudioFormSubmissions=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((value:unknown)=>z.object({projectId:z.string().uuid(),limit:z.number().int().min(1).max(200).default(100)}).parse(value))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    const {data:rows,error}=await sb.from('website_studio_form_submissions')
      .select('id,project_id,form_key,payload,source_url,status,created_at')
      .eq('project_id',data.projectId)
      .order('created_at',{ascending:false})
      .limit(data.limit);
    if(error)throw new Error(error.message);
    return rows??[];
  });

export const updateWebsiteStudioFormSubmission=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((value:unknown)=>z.object({id:z.string().uuid(),status:statusSchema}).parse(value))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    const {data:row,error}=await sb.from('website_studio_form_submissions').update({status:data.status}).eq('id',data.id).select('id,status').single();
    if(error)throw new Error(error.message);
    return row;
  });
