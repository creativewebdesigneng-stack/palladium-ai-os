import type {DropshipChannel} from './dropshipping';

export type ListingDraftRecord={
  text:string;
  channel:DropshipChannel;
  status:'draft';
  generated_at:string;
  provider?:string;
  model?:string;
  requires_approval:true;
};

export type ListingDraftMetadata=Record<string,unknown>&{listing_drafts:Record<string,ListingDraftRecord>};

type CatalogLike={
  name:string;
  sku?:string|null;
  category?:string|null;
  description?:string|null;
  cost_price?:number|null;
  sale_price?:number|null;
  currency?:string|null;
  metadata?:Record<string,unknown>|null;
};

const clean=(value:unknown,max=4000)=>typeof value==='string'?value.trim().slice(0,max):'';
const json=(value:unknown,max=7000)=>JSON.stringify(value??null).slice(0,max);

export function isDropshipProductBlocked(item:CatalogLike):boolean{
  const metadata=item.metadata??{};
  const compliance=metadata['compliance'];
  const stage=metadata['lifecycle_stage'];
  return stage==='blocked'||stage==='rejected'||Boolean(compliance&&typeof compliance==='object'&&(compliance as Record<string,unknown>)['allowed']===false);
}

export function buildListingDraftPrompt(item:CatalogLike,channel:DropshipChannel,locale='en-GB',notes=''){
  if(isDropshipProductBlocked(item))throw new Error('Blocked or rejected products cannot enter the listing-draft flow until the product decision is resolved.');
  const metadata=item.metadata??{};
  const evidence=metadata['evidence'];
  const economics=metadata['unit_economics'];
  const compliance=metadata['compliance'];
  const prompt=[
    'Create an INTERNAL DRAFT product listing for a dropshipping operator. Do not publish or perform any external action.',
    `Target channel: ${channel}. Locale: ${clean(locale,40)||'en-GB'}.`,
    `PRODUCT NAME: ${clean(item.name,180)}`,
    `SKU: ${clean(item.sku,120)||'not supplied'}`,
    `CATEGORY: ${clean(item.category,160)||'not supplied'}`,
    `PRICE: ${Number(item.sale_price??0)} ${clean(item.currency,8)||'currency not supplied'}`,
    `DESCRIPTION / VALIDATED NOTES: ${clean(item.description,900)||'not supplied'}`,
    `DROPSHIPPING METADATA: ${json({channel:metadata['channel'],fulfilment_model:metadata['fulfilment_model'],opportunity_score:metadata['opportunity_score'],supplier_score:metadata['supplier_score']},700)}`,
    `EVIDENCE SNAPSHOT: ${json(evidence,1000)}`,
    `COMPLIANCE SNAPSHOT: ${json(compliance,650)}`,
    `UNIT ECONOMICS SNAPSHOT: ${json(economics,650)}`,
    notes.trim()?`OPERATOR NOTES (instructions, not verified facts): ${clean(notes,500)}`:'',
    'Use only the supplied product record as factual evidence. Do not invent sales volume, search volume, stock, shipping speed, materials, dimensions, certifications, warranties, origin, reviews, scarcity, discounts or performance claims.',
    'If a useful fact is missing, omit it or put it under "Fact checks before publish". Never convert an inference into a factual claim.',
    'Keep marketplace-policy and IP risks visible. The result remains a draft requiring human approval before any provider write.',
    'Return Markdown with these headings: Title, Key bullets, Description, SEO/search phrases, Fact checks before publish.',
  ].filter(Boolean).join('\n');
  return prompt.slice(0,3900);
}

export function withListingDraftMetadata(metadata:Record<string,unknown>|null|undefined,input:{channel:DropshipChannel;text:string;provider?:string;model?:string;generatedAt?:string}):ListingDraftMetadata{
  const existing=metadata??{};
  const currentDrafts=existing['listing_drafts'];
  const drafts=(currentDrafts&&typeof currentDrafts==='object'&&!Array.isArray(currentDrafts)?currentDrafts:{}) as Record<string,ListingDraftRecord>;
  const record:ListingDraftRecord={
    text:input.text.trim().slice(0,16000),
    channel:input.channel,
    status:'draft',
    generated_at:input.generatedAt??new Date().toISOString(),
    ...(input.provider?{provider:input.provider}:{}),
    ...(input.model?{model:input.model}:{}),
    requires_approval:true,
  };
  return {...existing,listing_drafts:{...drafts,[input.channel]:record}};
}


type JsonSchemaLike={properties?:Record<string,{type?:string}>;required?:string[]};

export function buildDropshippingActionInputTemplate(
  schema:JsonSchemaLike|Record<string,unknown>|null|undefined,
  item:CatalogLike,
  draftText:string,
){
  const raw=schema&&typeof schema==='object'&&!Array.isArray(schema)?schema as JsonSchemaLike:{};
  const properties=raw.properties&&typeof raw.properties==='object'&&!Array.isArray(raw.properties)?raw.properties:{};
  const output:Record<string,unknown>={};
  const metadata=item.metadata??{};
  const keyValue=(key:string):unknown=>{
    const normalized=key.toLowerCase().replace(/[^a-z0-9]/g,'');
    if(['title','name','producttitle','listingtitle'].includes(normalized))return item.name;
    if(['description','body','content','listingdescription','productdescription'].includes(normalized))return draftText.trim().slice(0,16000);
    if(['sku','seller_sku','sellersku'].includes(key.toLowerCase()))return item.sku??undefined;
    if(['price','saleprice','listingprice'].includes(normalized))return item.sale_price??undefined;
    if(['currency','currencycode'].includes(normalized))return item.currency??undefined;
    if(['category','categoryname'].includes(normalized))return item.category??undefined;
    if(['fulfilmentmodel','fulfillmentmodel'].includes(normalized))return metadata['fulfilment_model']??undefined;
    return undefined;
  };
  for(const key of Object.keys(properties).slice(0,100)){
    const value=keyValue(key);
    if(value!==undefined&&value!==null&&value!=='')output[key]=value;
  }
  return output;
}
