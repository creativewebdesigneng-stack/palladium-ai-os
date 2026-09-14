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
  .validator((value:unknown)=>opportunitySchema.parse(value))
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
  .validator((value:unknown)=>z.object({id:uuid,status:z.enum(['watching','testing','winner','paused','rejected'])}).parse(value))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    const {data:out,error}=await sb.from('dropshipping_opportunities').update({status:data.status,updated_at:new Date().toISOString()}).eq('id',data.id).eq('user_id',context.userId).select().single();
    if(error)throw new Error(error.message);
    return out;
  });


const snapshotSchema=z.object({
  opportunity_id:uuid,
  reason:z.enum(['manual','ai_recheck','promotion','status_change']).default('manual'),
  evidence_urls:z.array(z.union([z.string(),z.object({url:z.string(),label:z.string().optional()})])).max(12).optional(),
  research_report:z.string().trim().max(30000).nullish(),
});

async function loadOwnedOpportunity(sb:Sb,userId:string,id:string){
  const {data,error}=await sb.from('dropshipping_opportunities')
    .select('id,user_id,opportunity_score,demand_score,search_momentum,competition_score,margin_score,supplier_score,compliance_risk,evidence_urls')
    .eq('id',id).eq('user_id',userId).maybeSingle();
  if(error)throw new Error(error.message);
  if(!data)throw new Error('Dropshipping opportunity not found.');
  return data;
}

export const listDropshippingOpportunitySnapshots=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .validator((value:unknown)=>z.object({opportunity_id:uuid.optional()}).parse(value??{}))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    let query=sb.from('dropshipping_opportunity_snapshots').select('*').eq('user_id',context.userId).order('checked_at',{ascending:false}).limit(500);
    if(data.opportunity_id)query=query.eq('opportunity_id',data.opportunity_id);
    const {data:rows,error}=await query;
    if(error)throw new Error(error.message);
    return rows??[];
  });

export const recordDropshippingOpportunitySnapshot=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .validator((value:unknown)=>snapshotSchema.parse(value))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    const opportunity=await loadOwnedOpportunity(sb,context.userId,data.opportunity_id);
    const suppliedEvidence=normalizeOpportunityEvidence(data.evidence_urls??[]);
    const existingEvidence=normalizeOpportunityEvidence(opportunity.evidence_urls??[]);
    const evidence=normalizeOpportunityEvidence([...suppliedEvidence,...existingEvidence]);
    const checkedAt=new Date().toISOString();
    const {data:out,error}=await sb.from('dropshipping_opportunity_snapshots').insert({
      user_id:context.userId,
      opportunity_id:opportunity.id,
      reason:data.reason,
      opportunity_score:opportunity.opportunity_score,
      demand_score:opportunity.demand_score,
      search_momentum:opportunity.search_momentum,
      competition_score:opportunity.competition_score,
      margin_score:opportunity.margin_score,
      supplier_score:opportunity.supplier_score,
      compliance_risk:opportunity.compliance_risk,
      evidence_urls:evidence,
      source_count:suppliedEvidence.length,
      research_report:data.research_report||null,
      checked_at:checkedAt,
    }).select().single();
    if(error)throw new Error(error.message);
    const {error:updateError}=await sb.from('dropshipping_opportunities')
      .update({last_checked_at:checkedAt,updated_at:checkedAt})
      .eq('id',opportunity.id).eq('user_id',context.userId);
    if(updateError)throw new Error(updateError.message);
    return out;
  });


export const updateDropshippingOpportunityMonitor=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .validator((value:unknown)=>z.object({
    id:uuid,
    enabled:z.boolean(),
    interval_hours:z.coerce.number().int().min(1).max(168).default(24),
  }).parse(value))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    const nextCheck=data.enabled?new Date().toISOString():null;
    const {data:out,error}=await sb.from('dropshipping_opportunities').update({
      monitor_enabled:data.enabled,
      monitor_interval_hours:data.interval_hours,
      next_check_at:nextCheck,
      claimed_at:null,
      monitor_attempts:0,
      monitor_last_error:null,
      updated_at:new Date().toISOString(),
    }).eq('id',data.id).eq('user_id',context.userId).select().single();
    if(error)throw new Error(error.message);
    return out;
  });
