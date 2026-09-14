import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {prepareIntegrationAction} from '@/lib/integrations/agent-integration-runtime.server';
import {DROPSHIP_CHANNELS} from './dropshipping';
import {isDropshipProductBlocked,withListingDraftMetadata} from './dropshipping-listings';
import {buildDropshipPublicationAction,withQueuedPublicationMetadata} from './dropshipping-publication';

type Sb={from:(table:string)=>any};
const channelIds=DROPSHIP_CHANNELS.map(row=>row.id) as [string,...string[]];

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
    const metadata=(item.metadata&&typeof item.metadata==='object'&&!Array.isArray(item.metadata)?item.metadata:{}) as Record<string,unknown>;
    if(metadata['source']!=='dropshipping-hub')throw new Error('Only Dropshipping Hub products can store listing drafts here.');
    if(isDropshipProductBlocked({name:item.name,metadata}))throw new Error('Resolve the product compliance block before generating or saving channel copy.');
    const nextMetadata=withListingDraftMetadata(metadata,{
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

const etsySchema=z.object({
  shopId:z.number().int().positive(),
  quantity:z.number().int().min(1).max(999),
  whoMade:z.enum(['i_did','collective','someone_else']),
  whenMade:z.string().trim().min(1).max(40),
  taxonomyId:z.number().int().positive(),
  shippingProfileId:z.number().int().positive().optional(),
  readinessStateId:z.number().int().positive().optional(),
});

export const queueDropshippingListingPublication=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((value:unknown)=>z.object({
    workspace_id:z.string().uuid(),
    item_id:z.string().uuid(),
    channel:z.enum(['shopify','etsy']),
    etsy:etsySchema.optional(),
  }).superRefine((row,ctx)=>{
    if(row.channel==='etsy'&&!row.etsy)ctx.addIssue({code:z.ZodIssueCode.custom,path:['etsy'],message:'Etsy listing details are required.'});
  }).parse(value))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    const {data:item,error:readError}=await sb.from('retail_catalog_items')
      .select('id,workspace_id,user_id,name,category,sale_price,currency,metadata')
      .eq('id',data.item_id)
      .eq('workspace_id',data.workspace_id)
      .eq('user_id',context.userId)
      .maybeSingle();
    if(readError)throw new Error(readError.message);
    if(!item)throw new Error('Dropshipping product not found.');

    const metadata=(item.metadata&&typeof item.metadata==='object'&&!Array.isArray(item.metadata)?item.metadata:{}) as Record<string,unknown>;
    if(metadata['source']!=='dropshipping-hub')throw new Error('Only Dropshipping Hub products can enter the publication flow.');
    if(isDropshipProductBlocked({name:item.name,metadata}))throw new Error('Resolve the product compliance block before queuing publication.');

    const drafts=(metadata['listing_drafts']&&typeof metadata['listing_drafts']==='object'&&!Array.isArray(metadata['listing_drafts'])
      ?metadata['listing_drafts']:{}) as Record<string,unknown>;
    const savedDraft=(drafts[data.channel]&&typeof drafts[data.channel]==='object'&&!Array.isArray(drafts[data.channel])
      ?drafts[data.channel]:{}) as Record<string,unknown>;
    const draftText=typeof savedDraft['text']==='string'?savedDraft['text'].trim():'';
    if(!draftText)throw new Error(`Save and review the ${data.channel} listing draft before queuing publication.`);

    const publications=(metadata['listing_publications']&&typeof metadata['listing_publications']==='object'&&!Array.isArray(metadata['listing_publications'])
      ?metadata['listing_publications']:{}) as Record<string,unknown>;
    const currentPublication=(publications[data.channel]&&typeof publications[data.channel]==='object'&&!Array.isArray(publications[data.channel])
      ?publications[data.channel]:{}) as Record<string,unknown>;
    const priorApprovalId=typeof currentPublication['approval_request_id']==='string'?currentPublication['approval_request_id']:'';
    if(priorApprovalId){
      const prior=await sb.from('approval_requests').select('id,status').eq('id',priorApprovalId).eq('user_id',context.userId).maybeSingle();
      if(prior.error)throw new Error(prior.error.message);
      if(prior.data?.status==='pending')throw new Error('This channel already has a pending publication approval.');
    }

    const mapped=buildDropshipPublicationAction({
      channel:data.channel,
      product:{name:item.name,category:item.category,sale_price:item.sale_price,currency:item.currency,metadata},
      draftText,
      ...(data.etsy?{etsy:data.etsy}:{}),
    });
    const prepared=await prepareIntegrationAction({
      userId:context.userId,
      provider:mapped.provider,
      action:mapped.action,
      actionInput:mapped.input,
    });
    if(!prepared.requiresApproval)throw new Error('This listing write is not configured behind Blackstar approval controls.');

    const {data:approval,error:approvalError}=await sb.from('approval_requests').insert({
      user_id:context.userId,
      action_type:'nango_dynamic_action',
      title:`Create ${data.channel} draft listing: ${String(item.name).slice(0,120)}`.slice(0,180),
      summary:'Approve creation of this reviewed Dropshipping Hub listing draft. The provider, transport and bounded payload are frozen until approval execution.',
      details:{
        provider:prepared.provider,
        action:prepared.action,
        input:prepared.input,
        transport:prepared.transport,
        dropshipping_item_id:item.id,
        dropshipping_workspace_id:item.workspace_id,
        dropshipping_channel:data.channel,
      },
      risk_level:prepared.risk,
      status:'pending',
    }).select('id').maybeSingle();
    if(approvalError||!approval?.id)throw new Error(approvalError?.message??'Could not queue the listing publication approval.');

    const nextMetadata=withQueuedPublicationMetadata(metadata,{
      channel:data.channel,
      approvalRequestId:String(approval.id),
      provider:prepared.provider,
      action:prepared.action,
    });
    const update=await sb.from('retail_catalog_items')
      .update({metadata:nextMetadata,updated_at:new Date().toISOString()})
      .eq('id',data.item_id)
      .eq('workspace_id',data.workspace_id)
      .eq('user_id',context.userId)
      .select('id')
      .maybeSingle();
    if(update.error||!update.data){
      await sb.from('approval_requests')
        .update({status:'expired',decided_at:new Date().toISOString(),decision_note:'Product publication state could not be persisted.'})
        .eq('id',approval.id)
        .eq('user_id',context.userId)
        .eq('status','pending');
      throw new Error(update.error?.message??'Could not persist the listing publication approval state.');
    }

    return {
      queued:true as const,
      approval_request_id:String(approval.id),
      status:'pending' as const,
      provider:prepared.provider,
      action:prepared.action,
      transport:prepared.transport,
    };
  });
