export type DropshipChannel='blackstar-site'|'shopify'|'amazon'|'ebay'|'etsy'|'woocommerce'|'tiktok-shop'|'walmart';
export type FulfilmentModel='wholesale-supplier'|'manufacturer'|'pod'|'retailer-arbitrage'|'marketplace-arbitrage'|'owned-stock';
export type OpportunitySignals={demand:number;searchMomentum:number;competition:number;margin:number;shipping:number;supplierReliability:number;seasonality:number;returnRisk:number;complianceRisk:number};
const clamp=(n:number,min=0,max=100)=>Math.max(min,Math.min(max,Number.isFinite(n)?n:0));
const round=(n:number)=>Math.round(n*100)/100;

export const DROPSHIP_CHANNELS=[
  {id:'blackstar-site',label:'Blackstar Website Studio',kind:'owned',connection:'native'},
  {id:'shopify',label:'Shopify',kind:'store',connection:'native'},
  {id:'amazon',label:'Amazon',kind:'marketplace',connection:'integration'},
  {id:'ebay',label:'eBay',kind:'marketplace',connection:'integration'},
  {id:'etsy',label:'Etsy',kind:'marketplace',connection:'integration'},
  {id:'woocommerce',label:'WooCommerce',kind:'store',connection:'integration'},
  {id:'tiktok-shop',label:'TikTok Shop',kind:'marketplace',connection:'integration'},
  {id:'walmart',label:'Walmart Marketplace',kind:'marketplace',connection:'integration'},
] as const;

export const DROPSHIP_AGENTS=[
  {id:'product-scout',name:'Product Scout',purpose:'Find and rank product opportunities from connected research, marketplace and search signals.',approval:false},
  {id:'supplier-analyst',name:'Supplier Analyst',purpose:'Compare landed cost, delivery promises, reliability, MOQ, stock stability and returns.',approval:false},
  {id:'listing-seo',name:'Listing & SEO Agent',purpose:'Build titles, descriptions, tags, keyword clusters, attributes and localised listing copy.',approval:true},
  {id:'pricing',name:'Pricing Agent',purpose:'Model unit economics and recommend channel prices without crossing minimum-margin guardrails.',approval:true},
  {id:'inventory',name:'Inventory Agent',purpose:'Watch supplier stock, cost changes and channel inventory to reduce overselling and stockouts.',approval:true},
  {id:'order-ops',name:'Order Ops Agent',purpose:'Route fulfilment, tracking and delivery exceptions through approved connected providers.',approval:true},
  {id:'support',name:'Support Agent',purpose:'Draft grounded responses using order, tracking, returns and store-policy context.',approval:true},
  {id:'marketing',name:'Marketing Agent',purpose:'Create campaign concepts, creatives, email/social copy and testing plans; spend/publish stays gated.',approval:true},
  {id:'compliance',name:'Compliance Agent',purpose:'Flag marketplace-rule, IP, product-safety, restricted-goods and misleading-claim risks.',approval:false},
  {id:'store-builder',name:'Store Builder Agent',purpose:'Turn a niche and selected products into a Website Studio-ready branded storefront brief.',approval:true},
] as const;

export function calculateOpportunityScore(signals:OpportunitySignals){
  const s={...signals};
  const positive=clamp(s.demand)*.22+clamp(s.searchMomentum)*.17+(100-clamp(s.competition))*.13+clamp(s.margin)*.16+clamp(s.shipping)*.08+clamp(s.supplierReliability)*.10+clamp(s.seasonality)*.04;
  const penalties=clamp(s.returnRisk)*.05+clamp(s.complianceRisk)*.12;
  const score=clamp(positive-penalties);
  const band=score>=75?'strong':score>=55?'promising':score>=35?'watch':'weak';
  return {score:round(score),band,explanation:[`Demand ${clamp(s.demand)}/100`,`Search momentum ${clamp(s.searchMomentum)}/100`,`Competition ${clamp(s.competition)}/100`,`Margin quality ${clamp(s.margin)}/100`,`Compliance risk ${clamp(s.complianceRisk)}/100`]};
}

export function calculateUnitEconomics(input:{sellPrice:number;productCost:number;shippingCost:number;marketplaceFeePct:number;paymentFeePct:number;adCost:number;returnsReservePct:number;taxReservePct?:number}){
  const sell=Math.max(0,input.sellPrice||0);
  const fees=sell*(Math.max(0,input.marketplaceFeePct||0)+Math.max(0,input.paymentFeePct||0))/100;
  const returns=sell*Math.max(0,input.returnsReservePct||0)/100;
  const tax=sell*Math.max(0,input.taxReservePct||0)/100;
  const totalCost=Math.max(0,input.productCost||0)+Math.max(0,input.shippingCost||0)+Math.max(0,input.adCost||0)+fees+returns+tax;
  const profit=sell-totalCost;
  return {revenue:round(sell),fees:round(fees),returnsReserve:round(returns),taxReserve:round(tax),totalCost:round(totalCost),profit:round(profit),marginPct:sell?round(profit/sell*100):0,breakEvenRoas:Math.max(0,input.adCost||0)?round(sell/Math.max(.01,input.adCost)):null};
}

export function calculateSupplierScore(input:{reliability:number;stockStability:number;shippingSpeed:number;quality:number;returns:number;landedCost:number}){
  const score=clamp(clamp(input.reliability)*.25+clamp(input.stockStability)*.20+clamp(input.shippingSpeed)*.18+clamp(input.quality)*.22+clamp(input.returns)*.08+clamp(input.landedCost)*.07);
  return {score:round(score),band:score>=80?'preferred':score>=60?'viable':score>=40?'review':'high-risk'};
}

export function assessChannelCompliance(input:{channel:DropshipChannel;fulfilmentModel:FulfilmentModel;originalDesign?:boolean;productionPartnerDisclosed?:boolean;restrictedProduct?:boolean;ipRisk?:boolean}){
  const reasons:string[]=[];
  let allowed=true;
  if(input.restrictedProduct){allowed=false;reasons.push('Restricted or regulated products require a separate compliance review and cannot be auto-published.');}
  if(input.ipRisk){allowed=false;reasons.push('Potential trademark, copyright or counterfeit risk must be resolved before listing.');}
  if(input.channel==='ebay'&&['retailer-arbitrage','marketplace-arbitrage'].includes(input.fulfilmentModel)){allowed=false;reasons.push('eBay dropshipping should use a wholesale supplier; post-sale retailer/marketplace sourcing is not permitted.');}
  if(input.channel==='amazon'&&['retailer-arbitrage','marketplace-arbitrage'].includes(input.fulfilmentModel)){allowed=false;reasons.push('Amazon fulfilment must preserve seller-of-record responsibilities; retailer/marketplace arbitrage is blocked by Blackstar guardrails.');}
  if(input.channel==='etsy'){
    const podOk=input.fulfilmentModel==='pod'&&input.originalDesign===true&&input.productionPartnerDisclosed===true;
    const allowedModel=input.fulfilmentModel==='owned-stock'||podOk;
    if(!allowedModel){allowed=false;reasons.push('Etsy is not a generic ready-made dropshipping channel. Use original designs with a disclosed production partner/POD or another Etsy-permitted model.');}
  }
  if(!reasons.length)reasons.push('No channel-specific blocker detected by the current rule set; listing still requires provider and product-policy checks.');
  return {allowed,status:allowed?'eligible':'blocked',requiresHumanReview:!allowed||input.channel==='etsy'||input.channel==='amazon'||input.channel==='ebay',reasons};
}

export function buildDropshipStoreBrief(input:{brandName:string;niche:string;audience:string;products:string[];channels:DropshipChannel[]}){
  const products=input.products.map(v=>v.trim()).filter(Boolean).slice(0,50);
  return {
    source:'dropshipping-hub',
    businessModel:'dropshipping',
    brandName:input.brandName.trim()||'New Store',
    niche:input.niche.trim(),audience:input.audience.trim(),products,channels:input.channels,
    goals:['conversion-first storefront','clear delivery expectations','trusted product pages','SEO-ready category structure','customer support and returns visibility'],
    pages:['Home','Shop','Product','About','Shipping & Delivery','Returns','FAQ','Contact'],
    requirements:['mobile-first','accessible','structured data','analytics-ready','no unsupported delivery or product claims'],
  };
}

export function dropshipProjectSlug(name:string){return (name||'dropship-store').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100)||'dropship-store';}
