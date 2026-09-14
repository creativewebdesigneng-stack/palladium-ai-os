import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {executeIntegrationAction,listIntegrationCapabilities,normalizeIntegrationProvider} from '@/lib/integrations/agent-integration-runtime.server';
import {boundedEvidenceResult,evidenceSummary,isSafeDropshipFulfilmentTransition} from './dropshipping-reconciliation';
import {orderHasDropshipProduct,orderLineItemIds,providerCanFulfilDropship} from './dropshipping-fulfilment';

type Sb={from:(table:string)=>any};
const uuid=z.string().uuid();
const readInputSchema=z.record(z.string(),z.unknown()).refine(value=>{
  try{return JSON.stringify(value).length<=60_000}catch{return false}
},'Provider read input is too large.');

async function loadOwnedDropshipOrder(sb:Sb,userId:string,input:{workspace_id:string;order_id:string}){
  const orderResult=await sb.from('retail_orders')
    .select('id,workspace_id,user_id,order_number,status,payment_status,fulfilment_status,line_items,total,currency,shipping_address,carrier,tracking_number,placed_at,fulfilled_at,updated_at')
    .eq('id',input.order_id)
    .eq('workspace_id',input.workspace_id)
    .eq('user_id',userId)
    .maybeSingle();
  if(orderResult.error)throw new Error(orderResult.error.message);
  if(!orderResult.data)throw new Error('Dropshipping order not found.');
  const order=orderResult.data;
  const itemIds=orderLineItemIds(order);
  if(!itemIds.length)throw new Error('This order has no authoritative catalog links.');
  const catalog=await sb.from('retail_catalog_items').select('id,metadata').eq('workspace_id',input.workspace_id).eq('user_id',userId).in('id',itemIds);
  if(catalog.error)throw new Error(catalog.error.message);
  if(!orderHasDropshipProduct(order,catalog.data??[]))throw new Error('This order is not linked to a Dropshipping Hub product.');
  return order;
}

export const getDropshippingReconciliationCapabilities=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .handler(async({context})=>{
    const rows=await listIntegrationCapabilities(context.userId);
    return rows
      .filter(row=>providerCanFulfilDropship(row.provider)&&row.deployed&&row.risk==='low'&&!row.requiresApproval)
      .map(row=>({provider:row.provider,action:row.action,description:row.description,transport:row.transport,lane:row.lane,inputSchemaJson:JSON.stringify(row.inputSchema).slice(0,30_000)}))
      .sort((a,b)=>a.provider===b.provider?a.action.localeCompare(b.action):a.provider.localeCompare(b.provider));
  });

export const readDropshippingFulfilmentEvidence=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((value:unknown)=>z.object({
    workspace_id:uuid,
    order_id:uuid,
    provider:z.string().trim().min(1).max(80),
    action:z.string().trim().min(1).max(160),
    transport:z.string().trim().min(1).max(80),
    action_input:readInputSchema,
  }).parse(value))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    const order=await loadOwnedDropshipOrder(sb,context.userId,data);
    const provider=normalizeIntegrationProvider(data.provider);
    if(!providerCanFulfilDropship(provider))throw new Error('The selected provider is not registered as a dropshipping supplier or shipping target.');

    const capabilities=await listIntegrationCapabilities(context.userId,provider);
    const selected=capabilities.find(row=>row.provider===provider&&row.action===data.action&&row.transport===data.transport&&row.deployed&&row.risk==='low'&&!row.requiresApproval);
    if(!selected)throw new Error('That provider read capability is no longer available or is not safe for automatic reconciliation.');

    const outcome=await executeIntegrationAction({
      userId:context.userId,
      provider,
      action:data.action,
      actionInput:data.action_input,
      transport:selected.transport,
    });
    if(!outcome.ok)throw new Error(outcome.error||'Provider reconciliation read failed.');

    const evidenceResult=boundedEvidenceResult(outcome.result);
    const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
    const inserted=await supabaseAdmin.from('dropshipping_fulfilment_evidence').insert({
      user_id:context.userId,
      workspace_id:data.workspace_id,
      order_id:data.order_id,
      provider,
      action:data.action,
      transport:selected.transport,
      result:evidenceResult as any,
    }).select('id,provider,action,transport,result,observed_at,reconciled_at').single();
    if(inserted.error)throw new Error(inserted.error.message);

    return {
      evidence:inserted.data,
      order:{id:order.id,order_number:order.order_number,fulfilment_status:order.fulfilment_status,carrier:order.carrier,tracking_number:order.tracking_number},
      summary:evidenceSummary(evidenceResult),
    };
  });

export const reconcileDropshippingFulfilmentEvidence=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((value:unknown)=>z.object({
    workspace_id:uuid,
    order_id:uuid,
    evidence_id:uuid,
    fulfilment_status:z.enum(['unfulfilled','picking','packed','shipped','ready_for_collection','collected','delivered','returned']),
    carrier:z.string().trim().max(160).optional(),
    tracking_number:z.string().trim().max(240).optional(),
  }).parse(value))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    const order=await loadOwnedDropshipOrder(sb,context.userId,data);
    if(!isSafeDropshipFulfilmentTransition(order.fulfilment_status,data.fulfilment_status)){
      throw new Error(`Cannot move fulfilment backward from ${order.fulfilment_status||'unfulfilled'} to ${data.fulfilment_status}.`);
    }
    const carrier=(data.carrier||'').trim();
    const tracking=(data.tracking_number||'').trim();
    if(['shipped','delivered','returned'].includes(data.fulfilment_status)&&!tracking&&!String(order.tracking_number||'').trim()){
      throw new Error('Tracking evidence is required before marking a dropshipping order shipped, delivered or returned.');
    }

    const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
    const evidenceResult=await supabaseAdmin.from('dropshipping_fulfilment_evidence')
      .select('id,user_id,workspace_id,order_id,provider,action,transport,result,observed_at,reconciled_at')
      .eq('id',data.evidence_id)
      .eq('user_id',context.userId)
      .eq('workspace_id',data.workspace_id)
      .eq('order_id',data.order_id)
      .maybeSingle();
    if(evidenceResult.error)throw new Error(evidenceResult.error.message);
    const evidence=evidenceResult.data;
    if(!evidence)throw new Error('Authoritative fulfilment evidence was not found.');
    if(evidence.reconciled_at)throw new Error('This provider evidence has already been reconciled.');
    const observedAt=Date.parse(String(evidence.observed_at||''));
    if(!Number.isFinite(observedAt)||Date.now()-observedAt>24*60*60*1000)throw new Error('Provider evidence is older than 24 hours. Run a fresh reconciliation read.');

    const now=new Date().toISOString();
    const update:any={
      fulfilment_status:data.fulfilment_status,
      ...(carrier?{carrier}:{}),
      ...(tracking?{tracking_number:tracking}:{}),
      updated_at:now,
    };
    if(['shipped','collected','delivered','returned'].includes(data.fulfilment_status)&&!order.fulfilled_at)update.fulfilled_at=now;
    const saved=await sb.from('retail_orders').update(update).eq('id',data.order_id).eq('workspace_id',data.workspace_id).eq('user_id',context.userId).select('id,order_number,fulfilment_status,carrier,tracking_number,fulfilled_at,updated_at').single();
    if(saved.error)throw new Error(saved.error.message);

    const marked=await supabaseAdmin.from('dropshipping_fulfilment_evidence').update({reconciled_at:now}).eq('id',data.evidence_id).eq('user_id',context.userId).is('reconciled_at',null);
    if(marked.error)throw new Error(marked.error.message);

    return {order:saved.data,evidence:{id:evidence.id,provider:evidence.provider,action:evidence.action,observed_at:evidence.observed_at,reconciled_at:now}};
  });
