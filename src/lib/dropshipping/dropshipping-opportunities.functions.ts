import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {calculateWatchlistScore,normalizeOpportunityEvidence} from './dropshipping-opportunities';

type Sb={from:(table:string)=>any};
const uuid=z.string().uuid();
const score=z.coerce.number().min(0).max(100).nullish();
const opportunitySchema=z.object({
  id:uuid.optional(),
  workspace_id:uuid.nullish(),
  kind:z.enum(['product','keyword']).default('product'),
  status:z.enum(['watching','testing','winner','paused','rejected']).default('watching'),
  title:z.string().trim().min(1).max(200),
  niche:z.string().trim().max(200).nullish(),
  market:z.string().trim().max(160).nullish(),
  channel:z.string().trim().max(80).nullish(),
  opportunity_score:score,
  demand_score:score,
  search_momentum:score,
  competition_score:score,
  margin_score:score,
  supplier_score:score,
  compliance_risk:score,
  evidence_urls:z.array(z.union([z.string(),z.object({url:z.string(),label:z.string().optional()})])).max(12).optional(),
  notes:z.string().trim().max(12000).nullish(),
  last_checked_at:z.string().datetime({offset:true}).nullish(),
});

async function assertWorkspace(sb:Sb,userId:string,workspaceId:string|null|undefined){
  if(!workspaceId)return;
  const {data,error}=await sb.from('retail_workspaces').select('id').eq('id',workspaceId).eq('user_id',userId).maybeSingle();
  if(error)throw new Error(error.message);
  if(!data)throw new Error('Retail workspace not found.');
}

export const listDropshippingOpportunities=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .handler(async({context})=>{
    const sb=context.supabase as unknown as Sb;
    const {data,error}=await sb.from('dropshipping_opportunities').select('*').eq('user_id',context.userId).order('updated_at',{ascending:false}).limit(300);
    if(error)throw new Error(error.message);
    return data??[];
  });

export const saveDropshippingOpportunity=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((value:unknown)=>opportunitySchema.parse(value))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    await assertWorkspace(sb,context.userId,data.workspace_id);
    const evidence=normalizeOpportunityEvidence(data.evidence_urls??[]);
    const calculated=calculateWatchlistScore({
      demand:data.demand_score,
      searchMomentum:data.search_momentum,
      competition:data.competition_score,
      margin:data.margin_score,
      supplier:data.supplier_score,
      complianceRisk:data.compliance_risk,
    });
    const row={
      workspace_id:data.workspace_id||null,
      kind:data.kind,
      status:data.status,
      title:data.title,
      niche:data.niche||null,
      market:data.market||null,
      channel:data.channel||null,
      opportunity_score:data.opportunity_score??calculated,
      demand_score:data.demand_score??null,
      search_momentum:data.search_momentum??null,
      competition_score:data.competition_score??null,
      margin_score:data.margin_score??null,
      supplier_score:data.supplier_score??null,
      compliance_risk:data.compliance_risk??null,
      evidence_urls:evidence,
      notes:data.notes||null,
      last_checked_at:data.last_checked_at??new Date().toISOString(),
      updated_at:new Date().toISOString(),
    };
    if(data.id){
      const {data:out,error}=await sb.from('dropshipping_opportunities').update(row).eq('id',data.id).eq('user_id',context.userId).select().single();
      if(error)throw new Error(error.message);
      return out;
    }
    const {data:out,error}=await sb.from('dropshipping_opportunities').insert({...row,user_id:context.userId}).select().single();
    if(error)throw new Error(error.message);
    return out;
  });

export const updateDropshippingOpportunityStatus=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((value:unknown)=>z.object({id:uuid,status:z.enum(['watching','testing','winner','paused','rejected'])}).parse(value))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    const {data:out,error}=await sb.from('dropshipping_opportunities').update({status:data.status,updated_at:new Date().toISOString()}).eq('id',data.id).eq('user_id',context.userId).select().single();
    if(error)throw new Error(error.message);
    return out;
  });
