import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {prepareIntegrationAction,normalizeIntegrationProvider} from '@/lib/integrations/agent-integration-runtime.server';
import {notify} from '@/lib/notifications/notify.server';
import {DROPSHIP_CHANNELS} from './dropshipping';
import {DROPSHIP_CHANNEL_TARGETS} from './dropshipping-readiness';
import {isDropshipProductBlocked,withListingDraftMetadata} from './dropshipping-listings';

type Sb={from:(table:string)=>any};
const channelIds=DROPSHIP_CHANNELS.map(row=>row.id) as [string,...string[]];
const actionInputSchema=z.record(z.string(),z.unknown()).refine(value=>{
  try{return JSON.stringify(value).length<=50_000}catch{return false}
},'Provider action input is too large.');

function record(value:unknown):Record<string,unknown>{
  return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
}

function channelAllowsProvider(channel:string,provider:string){
  const target=DROPSHIP_CHANNEL_TARGETS.find(row=>row.id===channel);
  if(!target||target.native)return false;
  const normalized=normalizeIntegrationProvider(provider);
  return target.providers.some(alias=>normalizeIntegrationProvider(alias)===normalized);
}

async function loadOwnedDropshipItem(sb:Sb,userId:string,input:{workspace_id:string;item_id:string}){
  const {data:item,error}=await sb.from('retail_catalog_items')
    .select('id,workspace_id,user_id,name,sku,category,description,cost_price,sale_price,currency,metadata')
    .eq('id',input.item_id)
    .eq('workspace_id',input.workspace_id)
    .eq('user_id',userId)
    .maybeSingle();
  if(error)throw new Error(error.message);
  if(!item)throw new Error('Dropshipping product not found.');
  const metadata=record(item.metadata);
  if(metadata['source']!=='dropshipping-hub')throw new Error('Only Dropshipping Hub products can use this workflow.');
  if(isDropshipProductBlocked({...item,metadata}))throw new Error('Resolve the product compliance block before any channel action.');
  return {...item,metadata};
}

export const saveDropshippingListingDraft=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((value:unknown)=>z.object({
    workspace_id:z.string().uuid(),
    item_id:z.string().uuid(),
    channel:z.enum(channelIds),
    text:z.string().trim().min(1).max(16000),
    provider:z.string().trim().max(80).optional(),
    model:z.string().trim().max(160).optional(),
  }).parse(value))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    const item=await loadOwnedDropshipItem(sb,context.userId,data);
    const nextMetadata=withListingDraftMetadata(item.metadata,{
      channel:data.channel as any,
      text:data.text,
      ...(data.provider?{provider:data.provider}:{}),
      ...(data.model?{model:data.model}:{}),
    });
    const {data:updated,error:updateError}=await sb.from('retail_catalog_items')
      .update({metadata:nextMetadata,updated_at:new Date().toISOString()})
      .eq('id',data.item_id)
      .eq('workspace_id',data.workspace_id)
      .eq('user_id',context.userId)
      .select('id,name,metadata,updated_at')
      .single();
    if(updateError)throw new Error(updateError.message);
    return updated;
  });

export const queueDropshippingListingApproval=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((value:unknown)=>z.object({
    workspace_id:z.string().uuid(),
    item_id:z.string().uuid(),
    channel:z.enum(channelIds),
    provider:z.string().trim().min(1).max(80),
    action:z.string().trim().min(1).max(160),
    action_input:actionInputSchema,
  }).parse(value))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    const item=await loadOwnedDropshipItem(sb,context.userId,data);
    if(data.channel==='blackstar-site')throw new Error('Website Studio publishing uses its native deployment workflow, not a marketplace listing approval.');
    if(!channelAllowsProvider(data.channel,data.provider))throw new Error('The selected provider does not belong to this dropshipping channel.');

    const drafts=record(item.metadata['listing_drafts']);
    const draft=record(drafts[data.channel]);
    const draftText=typeof draft['text']==='string'?draft['text'].trim():'';
    if(!draftText)throw new Error(`Create and save a ${data.channel} listing draft before requesting publication approval.`);

    const prepared=await prepareIntegrationAction({
      userId:context.userId,
      provider:data.provider,
      action:data.action,
      actionInput:data.action_input,
    });

    if(!channelAllowsProvider(data.channel,prepared.provider))throw new Error('The live integration resolved to a provider outside the selected channel.');

    const title=`Publish ${item.name} to ${data.channel}`.slice(0,200);
    const summary=`Approve the exact ${prepared.action} provider payload for this persisted dropshipping listing draft. Blackstar will execute it once through the pinned ${prepared.transport} transport.`.slice(0,500);
    const details={
      provider:prepared.provider,
      action:prepared.action,
      input:prepared.input,
      transport:prepared.transport,
      lane:prepared.lane,
      dropshipping_item_id:item.id,
      dropshipping_workspace_id:item.workspace_id,
      dropshipping_channel:data.channel,
      listing_draft_generated_at:typeof draft['generated_at']==='string'?draft['generated_at']:null,
      listing_draft_requires_approval:true,
    };

    const {data:approval,error}=await sb.from('approval_requests').insert({
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
    if(error||!approval?.id)throw new Error(error?.message??'Could not create the marketplace publication approval.');

    await notify({
      userId:context.userId,
      type:'agent.input_required',
      title,
      body:summary,
      link:'/mission-control',
      metadata:{
        approval_request_id:approval.id,
        dropshipping_item_id:item.id,
        channel:data.channel,
        provider:prepared.provider,
        action:prepared.action,
      },
    });

    return {
      approval,
      provider:prepared.provider,
      action:prepared.action,
      transport:prepared.transport,
      lane:prepared.lane,
      requiresApproval:true as const,
    };
  });
