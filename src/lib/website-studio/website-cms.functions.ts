import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';

type Sb={from:(table:string)=>any};
const itemSchema=z.object({projectId:z.string().uuid(),collectionKey:z.string().trim().min(1).max(120),slug:z.string().trim().min(1).max(160),title:z.string().max(240).default(''),data:z.record(z.string(),z.unknown()).default({}),status:z.enum(['draft','published','archived']).default('draft')});

export const listWebsiteStudioCollectionItems=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((value:unknown)=>z.object({projectId:z.string().uuid(),collectionKey:z.string().trim().min(1).max(120)}).parse(value)).handler(async({data,context})=>{
 const sb=context.supabase as unknown as Sb;const {data:rows,error}=await sb.from('website_studio_collection_items').select('*').eq('project_id',data.projectId).eq('collection_key',data.collectionKey).order('updated_at',{ascending:false});if(error)throw new Error(error.message);return rows??[];
});

export const saveWebsiteStudioCollectionItem=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((value:unknown)=>itemSchema.parse(value)).handler(async({data,context})=>{
 const sb=context.supabase as unknown as Sb;const now=new Date().toISOString();const payload={project_id:data.projectId,collection_key:data.collectionKey,slug:data.slug,title:data.title,data:data.data,status:data.status,published_at:data.status==='published'?now:null,updated_at:now};const {data:row,error}=await sb.from('website_studio_collection_items').upsert(payload,{onConflict:'project_id,collection_key,slug'}).select('*').single();if(error)throw new Error(error.message);return row;
});

export const deleteWebsiteStudioCollectionItem=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((value:unknown)=>z.object({id:z.string().uuid()}).parse(value)).handler(async({data,context})=>{
 const sb=context.supabase as unknown as Sb;const {error}=await sb.from('website_studio_collection_items').delete().eq('id',data.id);if(error)throw new Error(error.message);return {ok:true};
});
