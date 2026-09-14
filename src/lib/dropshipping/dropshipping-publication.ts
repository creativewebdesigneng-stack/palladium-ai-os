import type {DropshipChannel} from './dropshipping';

export type SupportedDropshipPublicationChannel='shopify'|'etsy';

export type EtsyPublicationSettings={
  shopId:number;
  quantity:number;
  whoMade:'i_did'|'collective'|'someone_else';
  whenMade:string;
  taxonomyId:number;
  shippingProfileId?:number;
  readinessStateId?:number;
};

type ProductLike={
  name:string;
  category?:string|null;
  sale_price?:number|null;
  currency?:string|null;
  metadata?:Record<string,unknown>|null;
};

const clean=(value:unknown,max:number)=>typeof value==='string'?value.trim().slice(0,max):'';
const positiveInt=(value:number|undefined,label:string,required=true)=>{
  if(value===undefined&&!required)return undefined;
  if(!Number.isSafeInteger(value)||Number(value)<=0)throw new Error(`${label} must be a positive integer.`);
  return Number(value);
};
const htmlEscape=(value:string)=>value.replace(/[&<>"']/g,(char)=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
}[char]??char));

export function isSupportedDropshipPublicationChannel(channel:DropshipChannel):channel is SupportedDropshipPublicationChannel{
  return channel==='shopify'||channel==='etsy';
}

export function buildDropshipPublicationAction(input:{
  channel:SupportedDropshipPublicationChannel;
  product:ProductLike;
  draftText:string;
  etsy?:EtsyPublicationSettings;
}){
  const title=clean(input.product.name,input.channel==='etsy'?140:255);
  const draft=clean(input.draftText,16000);
  if(!title)throw new Error('Product title is required before publication can be queued.');
  if(!draft)throw new Error('A reviewed saved listing draft is required before publication can be queued.');

  if(input.channel==='shopify'){
    const category=clean(input.product.category,255);
    const descriptionHtml=`<div>${htmlEscape(draft).replace(/\n/g,'<br>')}</div>`.slice(0,20000);
    return {
      provider:'shopify' as const,
      action:'shopify_product_create_draft' as const,
      input:{
        title,
        description_html:descriptionHtml,
        ...(category?{product_type:category}:{}),
      },
    };
  }

  const settings=input.etsy;
  if(!settings)throw new Error('Etsy listing details are required before publication can be queued.');
  const price=Number(input.product.sale_price??0);
  if(!Number.isFinite(price)||price<=0)throw new Error('A positive sale price is required for Etsy draft creation.');
  const currency=clean(input.product.currency,8).toUpperCase();
  if(currency&&currency!=='USD'&&currency!=='EUR'&&currency!=='GBP'&&currency!=='CAD'&&currency!=='AUD'){
    // Etsy ultimately applies the shop currency. Keep the local record visible,
    // but do not silently convert or invent exchange-rate data here.
  }
  const whoMade=settings.whoMade;
  if(!['i_did','collective','someone_else'].includes(whoMade))throw new Error('Unsupported Etsy who-made value.');
  const whenMade=clean(settings.whenMade,40);
  if(!whenMade)throw new Error('Etsy when-made value is required.');

  return {
    provider:'etsy' as const,
    action:'etsy_draft_listing_create' as const,
    input:{
      shop_id:positiveInt(settings.shopId,'Etsy shop id'),
      quantity:positiveInt(settings.quantity,'Etsy quantity'),
      title,
      description:draft.slice(0,20000),
      price,
      who_made:whoMade,
      when_made:whenMade,
      taxonomy_id:positiveInt(settings.taxonomyId,'Etsy taxonomy id'),
      ...(settings.shippingProfileId?{shipping_profile_id:positiveInt(settings.shippingProfileId,'Etsy shipping profile id')}:{}),
      ...(settings.readinessStateId?{readiness_state_id:positiveInt(settings.readinessStateId,'Etsy readiness state id')}:{}),
    },
  };
}

export function withQueuedPublicationMetadata(
  metadata:Record<string,unknown>|null|undefined,
  input:{channel:SupportedDropshipPublicationChannel;approvalRequestId:string;provider:string;action:string;queuedAt?:string},
){
  const existing=metadata??{};
  const current=existing['listing_publications'];
  const publications=(current&&typeof current==='object'&&!Array.isArray(current)?current:{}) as Record<string,unknown>;
  return {
    ...existing,
    listing_publications:{
      ...publications,
      [input.channel]:{
        status:'pending_approval',
        approval_request_id:input.approvalRequestId,
        provider:input.provider,
        action:input.action,
        queued_at:input.queuedAt??new Date().toISOString(),
      },
    },
  };
}
