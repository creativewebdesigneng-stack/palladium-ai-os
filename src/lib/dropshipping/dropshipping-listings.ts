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

export function isDropshipProductBlocked(item:CatalogLike){
  const metadata=item.metadata??{};
  const compliance=metadata['compliance'];
  const stage=metadata['lifecycle_stage'];
  return stage==='blocked'||(compliance&&typeof compliance==='object'&&(compliance as Record<string,unknown>)['allowed']===false);
}

export function buildListingDraftPrompt(item:CatalogLike,channel:DropshipChannel,locale='en-GB',notes=''){
  if(isDropshipProductBlocked(item))throw new Error('Blocked products cannot enter the listing-draft flow until compliance is resolved.');
  const metadata=item.metadata??{};
  const evidence=metadata['evidence'];
  const economics=metadata['unit_economics'];
  const compliance=metadata['compliance'];
  return [
    'Create an INTERNAL DRAFT product listing for a dropshipping operator. Do not publish or perform any external action.',
    `Target channel: ${channel}. Locale: ${clean(locale,40)||'en-GB'}.`,
    'Use only the supplied product record as factual evidence. Do not invent sales volume, search volume, stock, shipping speed, materials, dimensions, certifications, warranties, origin, reviews, scarcity, discounts or performance claims.',
    'If a useful fact is missing, omit it or put it under "Fact checks before publish". Never convert an inference into a factual claim.',
    'Keep marketplace-policy and IP risks visible. The result must remain a draft requiring human approval before any provider write.',
    'Return Markdown with these headings: Title, Key bullets, Description, SEO/search phrases, Fact checks before publish.',
    '',
    `PRODUCT NAME: ${clean(item.name,180)}`,
    `SKU: ${clean(item.sku,120)||'not supplied'}`,
    `CATEGORY: ${clean(item.category,160)||'not supplied'}`,
    `DESCRIPTION / VALIDATED NOTES: ${clean(item.description,3000)||'not supplied'}`,
    `PRICE: ${Number(item.sale_price??0)} ${clean(item.currency,8)||'currency not supplied'}`,
    `DROPSHIPPING CHANNEL/MODEL METADATA: ${json({channel:metadata['channel'],fulfilment_model:metadata['fulfilment_model'],opportunity_score:metadata['opportunity_score'],supplier_score:metadata['supplier_score']},1800)}`,
    `EVIDENCE SNAPSHOT: ${json(evidence,3500)}`,
    `COMPLIANCE SNAPSHOT: ${json(compliance,2500)}`,
    `UNIT ECONOMICS SNAPSHOT: ${json(economics,2500)}`,
    notes.trim()?`OPERATOR NOTES (instructions, not verified facts): ${clean(notes,2000)}`:'',
  ].filter(Boolean).join('\n');
}

export function withListingDraftMetadata(metadata:Record<string,unknown>|null|undefined,input:{channel:DropshipChannel;text:string;provider?:string;model?:string;generatedAt?:string}){
  const existing=metadata??{};
  const currentDrafts=existing['listing_drafts'];
  const drafts=currentDrafts&&typeof currentDrafts==='object'&&!Array.isArray(currentDrafts)?currentDrafts as Record<string,unknown>:{};
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
