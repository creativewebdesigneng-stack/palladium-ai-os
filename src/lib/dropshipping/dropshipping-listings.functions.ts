import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {DROPSHIP_CHANNELS} from './dropshipping';
import {isDropshipProductBlocked,withListingDraftMetadata} from './dropshipping-listings';

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
