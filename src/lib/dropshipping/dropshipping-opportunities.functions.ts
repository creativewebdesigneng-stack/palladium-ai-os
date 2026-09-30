import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {writeAudit} from '@/lib/platform/audit.server';
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

const secretEvidenceAssignment=/(?:api[_ -]?key|apikey|access[_ -]?token|refresh[_ -]?token|secret|password|credential|authorization)\s*[:=]|bearer\s+[a-z0-9._~-]{12,}/i;
const supplierEvidenceSchema=z.object({
  id:uuid.optional(),
  opportunity_id:uuid,
  retail_supplier_id:uuid,
  supplier_sku:z.string().trim().max(240).nullish(),
  role:z.enum(['candidate','primary','backup','rejected']).default('candidate'),
  currency:z.string().trim().min(3).max(8).default('GBP'),
  unit_cost:z.coerce.number().min(0).max(1_000_000_000).nullish(),
  shipping_cost:z.coerce.number().min(0).max(1_000_000_000).nullish(),
  minimum_order_quantity:z.coerce.number().int().min(0).max(1_000_000_000).nullish(),
  estimated_delivery_days:z.coerce.number().int().min(0).max(3650).nullish(),
  stock_status:z.enum(['unknown','in_stock','low_stock','out_of_stock','backorder']).default('unknown'),
  supplier_score:score,
  evidence_urls:z.array(z.union([z.string(),z.object({url:z.string(),label:z.string().optional()})])).max(12).optional(),
  evidence_note:z.string().trim().max(4000).nullish().refine(value=>!value||!secretEvidenceAssignment.test(value),'Store credentials in Blackstar Integrations, not supplier evidence.'),
  observed_at:z.string().datetime({offset:true}).nullish(),
});

async function loadSupplierContext(sb:Sb,userId:string,opportunityId:string,supplierId:string){
  const [opportunityResult,supplierResult]=await Promise.all([
    sb.from('dropshipping_opportunities').select('id,workspace_id').eq('id',opportunityId).eq('user_id',userId).maybeSingle(),
    sb.from('retail_suppliers').select('id,workspace_id,name,status,website,lead_time_days,currency').eq('id',supplierId).eq('user_id',userId).maybeSingle(),
  ]);
  if(opportunityResult.error||supplierResult.error)throw new Error(opportunityResult.error?.message??supplierResult.error?.message??'Supplier context could not be verified.');
  if(!opportunityResult.data)throw new Error('Dropshipping opportunity not found.');
  if(!supplierResult.data)throw new Error('Retail supplier not found.');
  if(opportunityResult.data.workspace_id&&supplierResult.data.workspace_id!==opportunityResult.data.workspace_id){
    throw new Error('Retail supplier must belong to the opportunity workspace.');
  }
  return {opportunity:opportunityResult.data,supplier:supplierResult.data};
}

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

export const listDropshippingSupplierEvidence=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .validator((value:unknown)=>z.object({opportunity_id:uuid.optional()}).parse(value??{}))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    let offersQuery=sb.from('dropshipping_opportunity_suppliers').select('*').eq('user_id',context.userId).order('updated_at',{ascending:false}).limit(1000);
    if(data.opportunity_id)offersQuery=offersQuery.eq('opportunity_id',data.opportunity_id);
    const [offersResult,suppliersResult]=await Promise.all([
      offersQuery,
      sb.from('retail_suppliers').select('id,workspace_id,name,status,website,lead_time_days,currency').eq('user_id',context.userId).order('name',{ascending:true}).limit(1000),
    ]);
    if(offersResult.error||suppliersResult.error)throw new Error(offersResult.error?.message??suppliersResult.error?.message??'Supplier evidence could not be loaded.');
    return {offers:offersResult.data??[],suppliers:suppliersResult.data??[]};
  });

export const saveDropshippingSupplierEvidence=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .validator((value:unknown)=>supplierEvidenceSchema.parse(value))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    await loadSupplierContext(sb,context.userId,data.opportunity_id,data.retail_supplier_id);
    if(data.role==='primary'){
      let primaryQuery=sb.from('dropshipping_opportunity_suppliers')
        .select('id')
        .eq('user_id',context.userId)
        .eq('opportunity_id',data.opportunity_id)
        .eq('role','primary');
      if(data.id)primaryQuery=primaryQuery.neq('id',data.id);
      const {data:existingPrimary,error:primaryError}=await primaryQuery.limit(1).maybeSingle();
      if(primaryError)throw new Error(primaryError.message);
      if(existingPrimary)throw new Error('This opportunity already has a primary supplier. Mark that offer as backup or candidate first.');
    }
    const evidence=normalizeOpportunityEvidence(data.evidence_urls??[]);
    const now=new Date().toISOString();
    const row={
      opportunity_id:data.opportunity_id,
      retail_supplier_id:data.retail_supplier_id,
      supplier_sku:data.supplier_sku||null,
      role:data.role,
      currency:data.currency.toUpperCase(),
      unit_cost:data.unit_cost??null,
      shipping_cost:data.shipping_cost??null,
      minimum_order_quantity:data.minimum_order_quantity??null,
      estimated_delivery_days:data.estimated_delivery_days??null,
      stock_status:data.stock_status,
      supplier_score:data.supplier_score??null,
      evidence_urls:evidence,
      evidence_note:data.evidence_note||null,
      observed_at:data.observed_at??now,
      last_checked_at:now,
      updated_at:now,
    };
    const result=data.id
      ? await sb.from('dropshipping_opportunity_suppliers').update(row).eq('id',data.id).eq('opportunity_id',data.opportunity_id).eq('user_id',context.userId).select().single()
      : await sb.from('dropshipping_opportunity_suppliers').insert({...row,user_id:context.userId}).select().single();
    if(result.error)throw new Error(result.error.message);
    await writeAudit({
      userId:context.userId,
      action:data.id?'dropshipping.supplier_evidence_updated':'dropshipping.supplier_evidence_added',
      targetType:'dropshipping_opportunity_supplier',
      targetId:result.data?.id??data.id??null,
      metadata:{
        opportunity_id:data.opportunity_id,
        retail_supplier_id:data.retail_supplier_id,
        role:data.role,
        stock_status:data.stock_status,
        evidence_count:evidence.length,
      },
    });
    return result.data;
  });

export const deleteDropshippingSupplierEvidence=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .validator((value:unknown)=>z.object({id:uuid,opportunity_id:uuid}).parse(value))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    const {error}=await sb.from('dropshipping_opportunity_suppliers').delete().eq('id',data.id).eq('opportunity_id',data.opportunity_id).eq('user_id',context.userId);
    if(error)throw new Error(error.message);
    await writeAudit({
      userId:context.userId,
      action:'dropshipping.supplier_evidence_deleted',
      targetType:'dropshipping_opportunity_supplier',
      targetId:data.id,
      metadata:{opportunity_id:data.opportunity_id},
    });
    return {ok:true};
  });


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
    const supplierResult=await sb.from('dropshipping_opportunity_suppliers')
      .select('retail_supplier_id,supplier_sku,role,currency,unit_cost,shipping_cost,minimum_order_quantity,estimated_delivery_days,stock_status,supplier_score,evidence_urls,evidence_note,observed_at,last_checked_at')
      .eq('opportunity_id',opportunity.id).eq('user_id',context.userId).order('updated_at',{ascending:false}).limit(100);
    if(supplierResult.error)throw new Error(supplierResult.error.message);
    const supplierSummary=(supplierResult.data??[]).map((row:any)=>({
      retail_supplier_id:row.retail_supplier_id,
      supplier_sku:row.supplier_sku,
      role:row.role,
      currency:row.currency,
      unit_cost:row.unit_cost,
      shipping_cost:row.shipping_cost,
      minimum_order_quantity:row.minimum_order_quantity,
      estimated_delivery_days:row.estimated_delivery_days,
      stock_status:row.stock_status,
      supplier_score:row.supplier_score,
      evidence_urls:normalizeOpportunityEvidence(row.evidence_urls??[]),
      evidence_note:row.evidence_note,
      observed_at:row.observed_at,
      last_checked_at:row.last_checked_at,
    }));
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
      supplier_summary:supplierSummary,
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
