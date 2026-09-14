import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {createHash,randomBytes} from 'node:crypto';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';

type Sb={from:(table:string)=>any};

export const ensureWebsiteStudioFormToken=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((value:unknown)=>z.object({projectId:z.string().uuid()}).parse(value))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    const {data:project,error}=await sb.from('website_studio_projects').select('id,form_submit_token_hash').eq('id',data.projectId).maybeSingle();
    if(error)throw new Error(error.message);
    if(!project)throw new Error('Website Studio project not found.');
    const token=randomBytes(32).toString('base64url');
    const hash=createHash('sha256').update(token).digest('hex');
    const {error:updateError}=await sb.from('website_studio_projects').update({form_submit_token_hash:hash,updated_at:new Date().toISOString()}).eq('id',data.projectId);
    if(updateError)throw new Error(updateError.message);
    return {token,rotated:Boolean(project.form_submit_token_hash)};
  });
