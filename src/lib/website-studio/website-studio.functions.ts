import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

type Sb={from:(t:string)=>any};
const statuses=['draft','ready','published','archived'] as const;
const projectSchema=z.object({
  id:z.string().uuid().optional(),
  name:z.string().trim().min(1).max(160),
  slug:z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  prompt:z.string().max(12000).optional(),
  brief:z.record(z.string(),z.unknown()).default({}),
  pages:z.array(z.record(z.string(),z.unknown())).max(100).default([]),
  designTokens:z.record(z.string(),z.unknown()).default({}),
  html:z.string().max(500000).default(''),
  css:z.string().max(500000).default(''),
  javascript:z.string().max(500000).default(''),
  framework:z.string().trim().max(40).default('html'),
  status:z.enum(statuses).default('draft'),
  previewUrl:z.string().url().optional().nullable(),
  productionUrl:z.string().url().optional().nullable(),
  deploymentProvider:z.string().trim().max(80).optional().nullable(),
  deploymentId:z.string().trim().max(160).optional().nullable(),
});

export const listWebsiteStudioProjects=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .handler(async({context})=>{
    const sb=context.supabase as unknown as Sb;
    const {data,error}=await sb.from('website_studio_projects').select('*').order('updated_at',{ascending:false});
    if(error)throw new Error(error.message);
    return data??[];
  });

export const saveWebsiteStudioProject=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((v:unknown)=>projectSchema.parse(v))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    const row={
      name:data.name,
      slug:data.slug,
      prompt:data.prompt||null,
      brief:data.brief,
      pages:data.pages,
      design_tokens:data.designTokens,
      html:data.html,
      css:data.css,
      javascript:data.javascript,
      framework:data.framework,
      status:data.status,
      preview_url:data.previewUrl??null,
      production_url:data.productionUrl??null,
      deployment_provider:data.deploymentProvider??null,
      deployment_id:data.deploymentId??null,
      updated_at:new Date().toISOString(),
    };
    if(data.id){
      const {data:out,error}=await sb.from('website_studio_projects').update(row).eq('id',data.id).select().single();
      if(error)throw new Error(error.message);
      return out;
    }
    const {data:out,error}=await sb.from('website_studio_projects').insert({...row,user_id:context.userId}).select().single();
    if(error)throw new Error(error.message);
    return out;
  });

export const deleteWebsiteStudioProject=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((v:unknown)=>z.object({id:z.string().uuid()}).parse(v))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    const {error}=await sb.from('website_studio_projects').delete().eq('id',data.id);
    if(error)throw new Error(error.message);
    return {ok:true};
  });


const revisionSnapshot=z.object({
  name:z.string().max(160).optional(),
  slug:z.string().max(120).optional(),
  prompt:z.string().max(12000).optional(),
  brief:z.record(z.string(),z.unknown()).optional(),
  pages:z.array(z.record(z.string(),z.unknown())).max(100).optional(),
  design_tokens:z.record(z.string(),z.unknown()).optional(),
  html:z.string().max(500000).optional(),
  css:z.string().max(500000).optional(),
  javascript:z.string().max(500000).optional(),
  framework:z.string().max(40).optional(),
  status:z.enum(statuses).optional(),
});

export const listWebsiteStudioRevisions=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((v:unknown)=>z.object({projectId:z.string().uuid()}).parse(v))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    const {data:rows,error}=await sb.from('website_studio_revisions').select('id,project_id,label,snapshot,created_at').eq('project_id',data.projectId).order('created_at',{ascending:false}).limit(100);
    if(error)throw new Error(error.message);
    return rows??[];
  });

export const createWebsiteStudioRevision=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((v:unknown)=>z.object({
    projectId:z.string().uuid(),
    label:z.string().trim().min(1).max(160),
    snapshot:revisionSnapshot,
  }).parse(v))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    const {data:row,error}=await sb.from('website_studio_revisions').insert({
      project_id:data.projectId,user_id:context.userId,label:data.label,snapshot:data.snapshot,
    }).select().single();
    if(error)throw new Error(error.message);
    return row;
  });

export const deleteWebsiteStudioRevision=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((v:unknown)=>z.object({id:z.string().uuid()}).parse(v))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    const {error}=await sb.from('website_studio_revisions').delete().eq('id',data.id);
    if(error)throw new Error(error.message);
    return {ok:true};
  });
