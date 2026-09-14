import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {listIntegrationCapabilities,normalizeIntegrationProvider,prepareIntegrationAction} from '@/lib/integrations/agent-integration-runtime.server';
import {notify} from '@/lib/notifications/notify.server';
import {DROPSHIP_SUPPLIER_TARGETS} from './dropshipping-readiness';
import {dropshipOrderCatalogIds,isDropshipSupplierProvider} from './dropshipping-fulfilment';
import {isDropshipProductBlocked} from './dropshipping-listings';

type Sb={from:(table:string)=>any};
const actionInputSchema=z.record(z.string(),z.unknown()).refine(value=>{
  try{return JSON.stringify(value).length<=60_000}catch{return false}
},'Provider action input is too large.');

function record(value:unknown):Record<string,unknown>{
  return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
}
async function sha256(value:string){
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map(byte=>byte.toString(16).padStart(2,'0')).join('');
}
function supplierAliases(){
  return new Set(DROPSHIP_SUPPLIER_TARGETS.flatMap(target=>target.providers).map(normalizeIntegrationProvider));
}
async function loadOwnedDropshipOrder(sb:Sb,userId:string,workspaceId:string,orderId:string){
  const {data:order,error}=await sb.from('retail_orders')
    .select('id,workspace_id,user_id,order_number,status,payment_status,fulfilment_status,line_items,total,currency,shipping_address,placed_at')
    .eq('id',orderId).eq('workspace_id',workspaceId).eq('user_id',userId).maybeSingle();
  if(error)throw new Error(error.message);
  if(!order)throw new Error('Retail order not found.');
  if(['cancelled','refunded'].includes(String(order.status??'')))throw new Error('Cancelled or refunded orders cannot be sent to supplier fulfilment.');
  if(!['paid','authorised'].includes(String(order.payment_status??'')))throw new Error('Supplier fulfilment requires an authorised or paid customer order.');
  if(['delivered','collected','returned'].includes(String(order.fulfilment_status??'')))throw new Error('This order is already in a closed fulfilment state.');

  const ids=dropshipOrderCatalogIds(order);
  if(!ids.length)throw new Error('This order is not linked to a Dropshipping Hub catalog item.');
  const {data:items,error:itemError}=await sb.from('retail_catalog_items')
    .select('id,name,metadata').eq('workspace_id',workspaceId).eq('user_id',userId).in('id',ids);
  if(itemError)throw new Error(itemError.message);
  const dropshipItems=(items??[]).filter((item:any)=>record(item.metadata)['source']==='dropshipping-hub');
  if(!dropshipItems.length)throw new Error('This order has no owned Dropshipping Hub products.');
  if(dropshipItems.some((item:any)=>isDropshipProductBlocked({...item,metadata:record(item.metadata)})))throw new Error('Resolve the linked product compliance block before supplier fulfilment.');
  return {order,dropshipItems};
}

export const getDropshippingFulfilmentCapabilities=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .handler(async({context})=>{
    const aliases=supplierAliases();
    const capabilities=await listIntegrationCapabilities(context.userId);
    return capabilities
      .filter(capability=>aliases.has(normalizeIntegrationProvider(capability.provider)))
      .map(({provider,action,description,risk,requiresApproval,deployed,transport,lane,inputSchema})=>({
        provider,action,description,risk,requiresApproval,deployed,transport,lane,
        inputSchemaJson:JSON.stringify(inputSchema).slice(0,30_000),
      }))
      .sort((a,b)=>a.provider===b.provider?a.action.localeCompare(b.action):a.provider.localeCompare(b.provider));
  });

export const queueDropshippingFulfilmentApproval=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .validator((value:unknown)=>z.object({
    workspace_id:z.string().uuid(),
    order_id:z.string().uuid(),
    provider:z.string().trim().min(1).max(80),
    action:z.string().trim().min(1).max(160),
    action_input:actionInputSchema,
  }).parse(value))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    const {order,dropshipItems}=await loadOwnedDropshipOrder(sb,context.userId,data.workspace_id,data.order_id);
    if(!isDropshipSupplierProvider(data.provider))throw new Error('The selected provider is not an approved Dropshipping supplier or shipping target.');

    const prepared=await prepareIntegrationAction({
      userId:context.userId,
      provider:data.provider,
      action:data.action,
      actionInput:data.action_input,
    });
    if(!isDropshipSupplierProvider(prepared.provider))throw new Error('The live integration resolved outside the Dropshipping supplier allowlist.');
    if(!prepared.requiresApproval)throw new Error('Supplier fulfilment must use an approval-required provider capability.');

    const fingerprint=await sha256(JSON.stringify({
      provider:prepared.provider,action:prepared.action,transport:prepared.transport,input:prepared.input,
      orderId:order.id,fulfilmentStatus:order.fulfilment_status,
    }));
    const existing=await sb.from('approval_requests')
      .select('id,status,execution_status,execution_error,title,summary,risk_level,created_at')
      .eq('user_id',context.userId)
      .eq('action_type','nango_dynamic_action')
      .eq('details->>dropshipping_fulfilment_fingerprint',fingerprint)
      .in('status',['pending','approved'])
      .order('created_at',{ascending:false})
      .limit(1).maybeSingle();
    if(existing.error)throw new Error(existing.error.message);
    if(existing.data?.status==='pending')return {approval:existing.data,reused:true as const,provider:prepared.provider,action:prepared.action};
    if(existing.data?.status==='approved'){
      if(existing.data.execution_status==='failed')throw new Error('This exact fulfilment action was already approved but failed. Retry the immutable approved action from Mission Control.');
      throw new Error('This exact supplier fulfilment payload has already been approved.');
    }

    const title=`Fulfil dropshipping order ${String(order.order_number||order.id)}`.slice(0,200);
    const summary=`Approve the exact ${prepared.action} payload for ${dropshipItems.length} linked dropshipping product${dropshipItems.length===1?'':'s'}. Blackstar will execute it once through the pinned ${prepared.transport} transport.`.slice(0,500);
    const details={
      provider:prepared.provider,
      action:prepared.action,
      input:prepared.input,
      transport:prepared.transport,
      lane:prepared.lane,
      dropshipping_order_id:order.id,
      dropshipping_workspace_id:order.workspace_id,
      dropshipping_item_ids:dropshipItems.map((item:any)=>item.id),
      dropshipping_fulfilment_fingerprint:fingerprint,
      dropshipping_fulfilment_requires_approval:true,
    };
    const {data:approval,error:approvalError}=await sb.from('approval_requests').insert({
      user_id:context.userId,org_id:null,agent_id:null,task_id:null,
      action_type:'nango_dynamic_action',title,summary,details,
      risk_level:prepared.risk==='low'?'medium':prepared.risk,status:'pending',
    }).select('id,status,title,summary,risk_level,created_at').maybeSingle();
    if(approvalError||!approval?.id)throw new Error(approvalError?.message??'Could not create supplier fulfilment approval.');

    await notify({
      userId:context.userId,type:'agent.input_required',title,body:summary,link:'/mission-control',
      metadata:{approval_request_id:approval.id,dropshipping_order_id:order.id,provider:prepared.provider,action:prepared.action},
    });
    return {approval,reused:false as const,provider:prepared.provider,action:prepared.action};
  });
