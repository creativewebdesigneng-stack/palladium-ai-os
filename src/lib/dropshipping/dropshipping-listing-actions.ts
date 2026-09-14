import type {DropshipChannel} from './dropshipping';
import {isDropshipProductBlocked,type ListingDraftRecord} from './dropshipping-listings';

type Item={name:string;category?:string|null;sale_price?:number|null;currency?:string|null;metadata?:Record<string,unknown>|null};
type EtsyInput={shop_id:number;quantity:number;who_made:'i_did'|'collective'|'someone_else';when_made:string;taxonomy_id:number;shipping_profile_id?:number;readiness_state_id?:number};

const clean=(value:unknown,max:number)=>typeof value==='string'?value.trim().slice(0,max):'';
const escapeHtml=(value:string)=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

export function listingDraftSections(markdown:string){
  const result:Record<string,string>={};
  let section='';
  const buckets:Record<string,string[]>={};
  for(const raw of markdown.replace(/\r/g,'').split('\n')){
    const match=raw.match(/^#{1,6}\s*(Title|Key bullets|Description|SEO\/search phrases|Fact checks before publish)\s*:?[ \t]*(.*)$/i);
    if(match){section=match[1]!.toLowerCase();buckets[section]=[];if(match[2]?.trim())buckets[section]!.push(match[2].trim());continue;}
    if(section)buckets[section]!.push(raw);
  }
  for(const [key,lines] of Object.entries(buckets))result[key]=lines.join('\n').trim();
  return result;
}

export function assertDropshippingListingPublishable(item:Item,channel:DropshipChannel,draft:ListingDraftRecord|undefined){
  const metadata=item.metadata??{};
  if(metadata['source']!=='dropshipping-hub')throw new Error('Only Dropshipping Hub products can enter this listing action flow.');
  if(isDropshipProductBlocked(item))throw new Error('Resolve the persisted product compliance block before requesting a listing action.');
  if(metadata['channel']!==channel)throw new Error(`This product was compliance-validated for ${String(metadata['channel']??'another channel')}, not ${channel}. Save a channel-specific product decision before requesting publication.`);
  const compliance=metadata['compliance'];
  if(!compliance||typeof compliance!=='object'||Array.isArray(compliance)||(compliance as Record<string,unknown>)['allowed']!==true){
    throw new Error('A positive persisted channel-compliance decision is required before requesting publication.');
  }
  if(!draft||draft.channel!==channel||draft.status!=='draft'||!draft.text.trim())throw new Error('Save a current channel listing draft before requesting publication.');
  return true;
}

function descriptionHtml(markdown:string){
  const sections=listingDraftSections(markdown);
  const body=clean(sections['description']||markdown,18_000);
  return body.split(/\n{2,}/).map(part=>`<p>${escapeHtml(part.replace(/^[-*]\s+/gm,'').trim()).replace(/\n/g,'<br>')}</p>`).join('').slice(0,20_000);
}

export function buildShopifyDraftProductInput(item:Item,draft:ListingDraftRecord){
  const sections=listingDraftSections(draft.text);
  const title=clean(sections['title']||item.name,255)||clean(item.name,255);
  if(!title)throw new Error('A product title is required for Shopify.');
  const productType=clean(item.category,255);
  return {
    title,
    description_html:descriptionHtml(draft.text),
    ...(productType?{product_type:productType}:{}),
  };
}

export function buildEtsyDraftListingInput(item:Item,draft:ListingDraftRecord,operator:EtsyInput){
  const sections=listingDraftSections(draft.text);
  const title=clean(sections['title']||item.name,140)||clean(item.name,140);
  const description=clean(sections['description']||draft.text,20_000);
  const price=Number(item.sale_price??0);
  if(!Number.isFinite(price)||price<=0)throw new Error('A positive persisted sale price is required for Etsy.');
  return {
    shop_id:operator.shop_id,quantity:operator.quantity,title,description,price,
    who_made:operator.who_made,when_made:clean(operator.when_made,40),taxonomy_id:operator.taxonomy_id,
    ...(operator.shipping_profile_id?{shipping_profile_id:operator.shipping_profile_id}:{}),
    ...(operator.readiness_state_id?{readiness_state_id:operator.readiness_state_id}:{}),
  };
}

export function listingActionForChannel(item:Item,channel:DropshipChannel,draft:ListingDraftRecord,operator?:EtsyInput){
  if(channel==='shopify')return {provider:'shopify',action:'shopify_product_create_draft',input:buildShopifyDraftProductInput(item,draft)};
  if(channel==='etsy'){
    if(!operator)throw new Error('Etsy shop, taxonomy and maker fields are required before creating an Etsy draft listing.');
    return {provider:'etsy',action:'etsy_draft_listing_create',input:buildEtsyDraftListingInput(item,draft,operator)};
  }
  throw new Error(`${channel} does not yet advertise a bounded Blackstar listing-create action. Connect a provider capability before attempting an external listing write.`);
}
