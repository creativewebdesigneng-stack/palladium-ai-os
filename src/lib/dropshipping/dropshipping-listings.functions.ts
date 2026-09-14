import {createHash} from 'node:crypto';
import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {prepareIntegrationAction} from '@/lib/integrations/agent-integration-runtime.server';
import {DROPSHIP_CHANNELS,type DropshipChannel} from './dropshipping';
import {assertDropshippingListingPublishable,listingActionForChannel} from './dropshipping-listing-actions';
import {isDropshipProductBlocked,withListingApprovalMetadata,withListingDraftMetadata,type ListingDraftRecord} from './dropshipping-listings';

type Sb={from:(table:string)=>any};
const channelIds=DROPSHIP_CHANNELS.map(row=>row.id) as [string,...string[]];
const clean=(value:unknown,max=1000)=>typeof value==='string'?value.trim().slice(0,max):'';
const record=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};

function listingDraft(metadata:Record<string,unknown>,channel:string):ListingDraftRecord|undefined{
  const drafts=record(metadata['listing_drafts']);
  const value=drafts[channel];
  if(!value||typeof value!=='object'||Array.isArray(value))return undefined;
  return value as ListingDraftRecord;
}

function draftHash(draft:ListingDraftRecord){return createHash('sha256').update(`${draft.generated_at}\n${draft.text}`,'utf8').digest('hex');}

const etsyOperatorSchema=z.object({
  shop_id:z.number().int().positive(),quantity:z.number().int().min(1).max(999).default(1),
  who_made:z.enum(['i_did','collective','someone_else']),when_made:z.string().trim().min(1).max(40),taxonomy_id:z.number().int().positive(),
  shipping_profile_id:z.number().int().positive().optional(),readiness_state_id:z.number().int().positive().optional(),
});

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
    const {data:item,error:readError}=await sb.from('retail_catalog_items')
      .select('id,workspace_id,user_id,name,metadata')
      .eq('id',data.item_id)
      .eq('workspace_id',data.workspace_id)
      .eq('user_id',context.userId)
      .maybeSingle();
    if(readError)throw new Error(readError.message);
    if(!item)throw new Error('Dropshipping product not found.');
    const metadata=record(item.metadata);
    if(metadata['source']!=='dropshipping-hub')throw new Error('Only Dropshipping Hub products can store listing drafts here.');
    if(isDropshipProductBlocked({name:item.name,metadata}))throw new Error('Resolve the product compliance block before generating or saving channel copy.');

    const current=listingDraft(metadata,data.channel);
    const approvalRequestId=clean(current?.approval_request_id,60);
    if(approvalRequestId){
      const {error:expireError}=await sb.from('approval_requests').update({
        status:'expired',decided_at:new Date().toISOString(),decision_note:'The linked Dropshipping Hub listing draft was revised before approval.',
      }).eq('id',approvalRequestId).eq('user_id',context.userId).eq('status','pending');
      if(expireError)throw new Error(`Could not invalidate the pending listing approval: ${expireError.message}`);
    }

    const nextMetadata=withListingDraftMetadata(metadata,{
      channel:data.channel as DropshipChannel,
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

export const requestDropshippingListingApproval=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((value:unknown)=>z.object({
    workspace_id:z.string().uuid(),item_id:z.string().uuid(),channel:z.enum(channelIds),etsy:etsyOperatorSchema.optional(),
  }).parse(value))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    const {data:item,error:readError}=await sb.from('retail_catalog_items')
      .select('id,workspace_id,user_id,name,category,sale_price,currency,metadata')
      .eq('id',data.item_id).eq('workspace_id',data.workspace_id).eq('user_id',context.userId).maybeSingle();
    if(readError)throw new Error(readError.message);
    if(!item)throw new Error('Dropshipping product not found.');
    const metadata=record(item.metadata);
    const channel=data.channel as DropshipChannel;
    const draft=listingDraft(metadata,channel);
    assertDropshippingListingPublishable({...item,metadata},channel,draft);
    if(!draft)throw new Error('A saved listing draft is required.');
    const hash=draftHash(draft);

    const existingId=clean(draft.approval_request_id,60);
    if(existingId&&draft.approval_draft_hash===hash){
      const {data:existing,error:existingError}=await sb.from('approval_requests')
        .select('id,status,execution_status,execution_error,execution_result,action_type,risk_level,title,created_at')
        .eq('id',existingId).eq('user_id',context.userId).maybeSingle();
      if(existingError)throw new Error(existingError.message);
      if(existing?.status==='pending')return {approval:existing,reused:true};
    }

    const bound=listingActionForChannel({...item,metadata},channel,draft,data.etsy);
    const prepared=await prepareIntegrationAction({userId:context.userId,provider:bound.provider,action:bound.action,actionInput:bound.input});
    if(!prepared.requiresApproval)throw new Error('Blackstar will not bypass the governed approval path for an external listing write.');
    if(prepared.provider!==bound.provider||prepared.action!==bound.action)throw new Error('The prepared listing capability does not match the requested channel action.');

    const now=new Date().toISOString();
    const {data:approval,error:approvalError}=await sb.from('approval_requests').insert({
      user_id:context.userId,
      action_type:'nango_dynamic_action',
      title:`Create ${channel} draft listing for ${String(item.name).slice(0,120)}`.slice(0,200),
      summary:`Approve creating an external ${channel} draft from the currently saved Blackstar Dropshipping Hub listing copy.`.slice(0,500),
      details:{provider:prepared.provider,action:prepared.action,input:prepared.input,transport:prepared.transport,dropshipping_item_id:item.id,dropshipping_workspace_id:data.workspace_id,dropshipping_channel:channel,draft_hash:hash,draft_generated_at:draft.generated_at},
      risk_level:prepared.risk,status:'pending',
    }).select('id,status,execution_status,execution_error,execution_result,action_type,risk_level,title,created_at').single();
    if(approvalError||!approval?.id)throw new Error(approvalError?.message??'Could not create the listing approval request.');

    const linkedMetadata=withListingApprovalMetadata(metadata,{channel,approvalRequestId:approval.id,provider:prepared.provider,action:prepared.action,draftHash:hash,preparedAt:now});
    const {error:linkError}=await sb.from('retail_catalog_items').update({metadata:linkedMetadata,updated_at:now})
      .eq('id',item.id).eq('workspace_id',data.workspace_id).eq('user_id',context.userId);
    if(linkError){
      await sb.from('approval_requests').update({status:'expired',decided_at:new Date().toISOString(),decision_note:'The Dropshipping Hub listing approval could not be linked to its source product.'})
        .eq('id',approval.id).eq('user_id',context.userId).eq('status','pending');
      throw new Error(linkError.message);
    }
    return {approval,reused:false,capability:{provider:prepared.provider,action:prepared.action,description:prepared.description,risk:prepared.risk,transport:prepared.transport,lane:prepared.lane}};
  });

export const getDropshippingListingApproval=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((value:unknown)=>z.object({workspace_id:z.string().uuid(),item_id:z.string().uuid(),channel:z.enum(channelIds)}).parse(value))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    const {data:item,error:itemError}=await sb.from('retail_catalog_items').select('id,metadata')
      .eq('id',data.item_id).eq('workspace_id',data.workspace_id).eq('user_id',context.userId).maybeSingle();
    if(itemError)throw new Error(itemError.message);
    if(!item)return null;
    const draft=listingDraft(record(item.metadata),data.channel);
    const id=clean(draft?.approval_request_id,60);
    if(!id)return null;
    const {data:approval,error}=await sb.from('approval_requests')
      .select('id,status,execution_status,execution_error,execution_result,action_type,risk_level,title,created_at,decided_at,executed_at')
      .eq('id',id).eq('user_id',context.userId).maybeSingle();
    if(error)throw new Error(error.message);
    return approval??null;
  });
