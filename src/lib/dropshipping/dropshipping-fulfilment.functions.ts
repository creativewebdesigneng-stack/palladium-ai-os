import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {listIntegrationCapabilities,normalizeIntegrationProvider,prepareIntegrationAction} from '@/lib/integrations/agent-integration-runtime.server';
import {notify} from '@/lib/notifications/notify.server';
import {buildFulfilmentCapabilityRows,orderHasDropshipProduct,orderLineItemIds,providerCanFulfilDropship} from './dropshipping-fulfilment';

type Sb={from:(table:string)=>any};
const uuid=z.string().uuid();
const actionInputSchema=z.record(z.string(),z.unknown()).refine(value=>{
  try{return JSON.stringify(value).length<=60_000}catch{return false}
},'Provider action input is too large.');

async function sha256(value:string){
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map(byte=>byte.toString(16).padStart(2,'0')).join('');
}

async function loadOwnedDropshipOrder(sb:Sb,userId:string,input:{workspace_id:string;order_id:string}){
  const {data:order,error}=await sb.from('retail_orders')
    .select('id,workspace_id,user_id,order_number,status,payment_status,fulfilment_status,line_items,total,currency,shipping_address,carrier,tracking_number,placed_at,updated_at')
    .eq('id',input.order_id)
    .eq('workspace_id',input.workspace_id)
    .eq('user_id',userId)
    .maybeSingle();
  if(error)throw new Error(error.message);
  if(!order)throw new Error('Dropshipping order not found.');

  const itemIds=orderLineItemIds(order);
  if(!itemIds.length)throw new Error('This order has no authoritative catalog links. Link its line items before supplier fulfilment.');
  const catalogResult=await sb.from('retail_catalog_items')
    .select('id,name,metadata')
    .eq('workspace_id',input.workspace_id)
    .eq('user_id',userId)
    .in('id',itemIds);
  if(catalogResult.error)throw new Error(catalogResult.error.message);
  if(!orderHasDropshipProduct(order,catalogResult.data??[]))throw new Error('This order is not linked to a Dropshipping Hub product.');

  if(['cancelled','refunded','completed'].includes(String(order.status||'')))throw new Error('Closed orders cannot start a new supplier fulfilment action.');
  if(['delivered','returned','collected'].includes(String(order.fulfilment_status||'')))throw new Error('This order fulfilment is already closed.');
  return order;
}

export const getDropshippingFulfilmentCapabilities=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .handler(async({context})=>{
    const capabilities=await listIntegrationCapabilities(context.userId);
    return buildFulfilmentCapabilityRows(capabilities as any).map(row=>({
      provider:row.provider,
      action:row.action,
      description:row.description,
      risk:row.risk,
      requiresApproval:row.requiresApproval,
      deployed:row.deployed,
      transport:row.transport,
      lane:row.lane,
      targetId:row.targetId,
      inputSchemaJson:JSON.stringify((capabilities.find(cap=>normalizeIntegrationProvider(cap.provider)===normalizeIntegrationProvider(row.provider)&&cap.action===row.action)?.inputSchema)??{}).slice(0,30_000),
    }));
  });

export const queueDropshippingFulfilmentApproval=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((value:unknown)=>z.object({
    workspace_id:uuid,
    order_id:uuid,
    provider:z.string().trim().min(1).max(80),
    action:z.string().trim().min(1).max(160),
    action_input:actionInputSchema,
  }).parse(value))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    const provider=normalizeIntegrationProvider(data.provider);
    if(!providerCanFulfilDropship(provider))throw new Error('The selected provider is not registered as a dropshipping supplier or shipping execution target.');
    const order=await loadOwnedDropshipOrder(sb,context.userId,data);

    const prepared=await prepareIntegrationAction({
      userId:context.userId,
      provider,
      action:data.action,
      actionInput:data.action_input,
    });
    if(!providerCanFulfilDropship(prepared.provider))throw new Error('The live integration resolved outside the registered supplier/shipping targets.');
    if(!prepared.requiresApproval)throw new Error('Supplier, shipping and fulfilment writes must be approval-gated in Dropshipping Hub.');

    const orderRevision=String(order.updated_at||order.placed_at||'');
    const approvalFingerprint=await sha256(JSON.stringify({
      provider:prepared.provider,
      action:prepared.action,
      transport:prepared.transport,
      input:prepared.input,
      workspaceId:order.workspace_id,
      orderId:order.id,
      orderRevision,
    }));

    const existing=await sb.from('approval_requests')
      .select('id,status,execution_status,execution_error,title,summary,risk_level,created_at')
      .eq('user_id',context.userId)
      .eq('action_type','nango_dynamic_action')
      .eq('details->>dropshipping_fulfilment_fingerprint',approvalFingerprint)
      .in('status',['pending','approved'])
      .order('created_at',{ascending:false})
      .limit(1)
      .maybeSingle();
    if(existing.error)throw new Error(existing.error.message);
    if(existing.data?.status==='pending')return {approval:existing.data,reused:true as const,provider:prepared.provider,action:prepared.action,transport:prepared.transport,lane:prepared.lane};
    if(existing.data?.status==='approved'){
      if(existing.data.execution_status==='failed')throw new Error('This exact fulfilment action was approved but failed. Retry the immutable action from Mission Control instead of creating a duplicate.');
      throw new Error('This exact order revision and provider payload has already been approved. Refresh authoritative order state before requesting another fulfilment action.');
    }

    const orderLabel=String(order.order_number||order.id);
    const title=`Approve dropshipping fulfilment · ${orderLabel}`.slice(0,200);
    const summary=`Approve the exact ${prepared.action} payload for ${prepared.provider}. Blackstar will execute the pinned provider payload once through ${prepared.transport}; it will not mark the Retail order fulfilled until authoritative order/provider state is reconciled.`.slice(0,500);
    const details={
      provider:prepared.provider,
      action:prepared.action,
      input:prepared.input,
      transport:prepared.transport,
      lane:prepared.lane,
      dropshipping_workspace_id:order.workspace_id,
      dropshipping_order_id:order.id,
      dropshipping_order_revision:orderRevision||null,
      dropshipping_fulfilment:true,
      dropshipping_fulfilment_fingerprint:approvalFingerprint,
    };

    const inserted=await sb.from('approval_requests').insert({
      user_id:context.userId,
      org_id:null,
      agent_id:null,
      task_id:null,
      action_type:'nango_dynamic_action',
      title,
      summary,
      details,
      risk_level:prepared.risk==='low'?'medium':prepared.risk,
      status:'pending',
    }).select('id,status,title,summary,risk_level,created_at').maybeSingle();
    if(inserted.error||!inserted.data?.id)throw new Error(inserted.error?.message??'Could not create the dropshipping fulfilment approval.');

    await notify({
      userId:context.userId,
      type:'agent.input_required',
      title,
      body:summary,
      link:'/mission-control',
      metadata:{
        approval_request_id:inserted.data.id,
        dropshipping_order_id:order.id,
        provider:prepared.provider,
        action:prepared.action,
      },
    });

    return {approval:inserted.data,reused:false as const,provider:prepared.provider,action:prepared.action,transport:prepared.transport,lane:prepared.lane};
  });
