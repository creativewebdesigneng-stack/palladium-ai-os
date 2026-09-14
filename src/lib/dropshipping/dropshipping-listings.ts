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


export type ListingPublicationCapability={
  provider:string;
  action:string;
  description?:string;
  deployed:boolean;
  requiresApproval:boolean;
  risk?:'low'|'medium'|'high'|string;
};

export type ListingPublicationReadiness={
  readyForApproval:boolean;
  status:'blocked'|'needs-validation'|'needs-fact-checks'|'needs-connection'|'ready-for-approval';
  blockers:string[];
  capability:ListingPublicationCapability|null;
  requiresApproval:true;
};

const PUBLICATION_ACTION_HINT=/(?:listing|product|offer).*(?:create|update|publish|activate)|(?:create|update|publish|activate).*(?:listing|product|offer)/i;

function lifecycleStage(item:CatalogLike){
  const value=item.metadata?.['lifecycle_stage'];
  return typeof value==='string'?value:'';
}

export function selectListingPublicationCapability(
  capabilities:readonly ListingPublicationCapability[],
):ListingPublicationCapability|null{
  return capabilities.find((capability)=>
    capability.deployed
    && capability.requiresApproval
    && PUBLICATION_ACTION_HINT.test(capability.action)
  )??null;
}

export function assessListingPublicationReadiness(input:{
  item:CatalogLike;
  channel:DropshipChannel;
  unresolvedFactChecks?:number;
  capabilities?:readonly ListingPublicationCapability[];
}):ListingPublicationReadiness{
  const blockers:string[]=[];
  if(isDropshipProductBlocked(input.item)){
    blockers.push('Product compliance or lifecycle state blocks publication.');
  }

  const stage=lifecycleStage(input.item);
  if(stage&&!['validated','testing'].includes(stage)){
    blockers.push(`Product lifecycle stage "${stage}" is not approved for marketplace publication.`);
  }

  const factChecks=Math.max(0,Math.trunc(Number(input.unresolvedFactChecks??0)||0));
  if(factChecks>0){
    blockers.push(`${factChecks} listing fact check${factChecks===1?'':'s'} remain unresolved.`);
  }

  const capability=selectListingPublicationCapability(input.capabilities??[]);
  if(!capability){
    blockers.push(`No deployed approval-gated listing write capability is connected for ${input.channel}.`);
  }

  let status:ListingPublicationReadiness['status']='ready-for-approval';
  if(blockers.some((value)=>/compliance or lifecycle state blocks/i.test(value)))status='blocked';
  else if(blockers.some((value)=>/lifecycle stage/i.test(value)))status='needs-validation';
  else if(blockers.some((value)=>/fact check/i.test(value)))status='needs-fact-checks';
  else if(blockers.length)status='needs-connection';

  return {
    readyForApproval:blockers.length===0,
    status,
    blockers,
    capability,
    requiresApproval:true,
  };
}
