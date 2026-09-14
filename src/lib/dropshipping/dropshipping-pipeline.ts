import {assessChannelCompliance,calculateUnitEconomics,type DropshipChannel,type FulfilmentModel} from './dropshipping';

export type DropshipPipelineStage='researching'|'validated'|'testing'|'paused'|'rejected';

export type DropshipPipelineInput={
  workspaceId:string;
  supplierId?:string|null;
  name:string;
  sku?:string;
  category?:string;
  description?:string;
  currency:string;
  channel:DropshipChannel;
  fulfilmentModel:FulfilmentModel;
  stage:DropshipPipelineStage;
  evidenceUrl?:string;
  evidenceNotes?:string;
  opportunityScore?:number|null;
  supplierScore?:number|null;
  originalDesign?:boolean;
  productionPartnerDisclosed?:boolean;
  restrictedProduct?:boolean;
  ipRisk?:boolean;
  sellPrice:number;
  productCost:number;
  shippingCost:number;
  marketplaceFeePct:number;
  paymentFeePct:number;
  adCost:number;
  returnsReservePct:number;
  taxReservePct?:number;
};

const clampScore=(value:number|null|undefined)=>value==null?null:Math.max(0,Math.min(100,Number.isFinite(value)?value:0));
const clean=(value:string|undefined,max:number)=>value?.trim().slice(0,max)||undefined;

function optionalHttpUrl(value:string|undefined){
  const trimmed=value?.trim();
  if(!trimmed)return undefined;
  let url:URL;
  try{url=new URL(trimmed);}catch{throw new Error('Evidence URL must be a valid http(s) URL.');}
  if(!['http:','https:'].includes(url.protocol))throw new Error('Evidence URL must use http or https.');
  return url.toString().slice(0,2000);
}

export function buildDropshipCatalogPayload(input:DropshipPipelineInput){
  const name=input.name.trim();
  if(!name)throw new Error('Product name is required.');
  if(!input.workspaceId)throw new Error('Retail workspace is required.');
  const currency=input.currency.trim().toUpperCase();
  if(currency.length<3||currency.length>8)throw new Error('Currency must be between 3 and 8 characters.');

  const compliance=assessChannelCompliance({
    channel:input.channel,
    fulfilmentModel:input.fulfilmentModel,
    originalDesign:input.originalDesign??false,
    productionPartnerDisclosed:input.productionPartnerDisclosed??false,
    restrictedProduct:input.restrictedProduct??false,
    ipRisk:input.ipRisk??false,
  });
  const unitEconomics=calculateUnitEconomics({
    sellPrice:input.sellPrice,
    productCost:input.productCost,
    shippingCost:input.shippingCost,
    marketplaceFeePct:input.marketplaceFeePct,
    paymentFeePct:input.paymentFeePct,
    adCost:input.adCost,
    returnsReservePct:input.returnsReservePct,
    taxReservePct:input.taxReservePct??0,
  });
  const lifecycleStage=compliance.allowed?input.stage:'blocked';
  const evidenceUrl=optionalHttpUrl(input.evidenceUrl);

  return {
    workspace_id:input.workspaceId,
    supplier_id:input.supplierId||null,
    name:name.slice(0,180),
    item_type:'product' as const,
    sku:clean(input.sku,120),
    category:clean(input.category,160),
    description:clean(input.description,5000),
    cost_price:Math.max(0,input.productCost||0),
    sale_price:Math.max(0,input.sellPrice||0),
    currency,
    track_inventory:false,
    active:!['blocked','rejected','paused'].includes(lifecycleStage),
    metadata:{
      source:'dropshipping-hub',
      inventory_model:'supplier-managed',
      lifecycle_stage:lifecycleStage,
      channel:input.channel,
      fulfilment_model:input.fulfilmentModel,
      opportunity_score:clampScore(input.opportunityScore),
      supplier_score:clampScore(input.supplierScore),
      evidence:{url:evidenceUrl??null,notes:clean(input.evidenceNotes,4000)??null},
      compliance:{...compliance,checked_at:new Date().toISOString()},
      unit_economics:{...unitEconomics,inputs:{
        sell_price:Math.max(0,input.sellPrice||0),
        product_cost:Math.max(0,input.productCost||0),
        shipping_cost:Math.max(0,input.shippingCost||0),
        marketplace_fee_pct:Math.max(0,input.marketplaceFeePct||0),
        payment_fee_pct:Math.max(0,input.paymentFeePct||0),
        ad_cost:Math.max(0,input.adCost||0),
        returns_reserve_pct:Math.max(0,input.returnsReservePct||0),
        tax_reserve_pct:Math.max(0,input.taxReservePct||0),
      }},
      saved_at:new Date().toISOString(),
    },
  };
}
