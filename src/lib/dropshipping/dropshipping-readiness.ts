export type DropshipCapability={provider:string;action:string;description:string;risk:'low'|'medium'|'high';requiresApproval:boolean;deployed:boolean;transport:string;lane:string};
export type DropshipConnectionTarget={id:string;label:string;kind:'owned-store'|'marketplace'|'store'|'supplier'|'shipping';providers:readonly string[];native?:boolean};

export const DROPSHIP_CHANNEL_TARGETS:readonly DropshipConnectionTarget[]=[
  {id:'blackstar-site',label:'Blackstar Website Studio',kind:'owned-store',providers:[],native:true},
  {id:'shopify',label:'Shopify',kind:'store',providers:['shopify']},
  {id:'etsy',label:'Etsy',kind:'marketplace',providers:['etsy']},
  {id:'amazon',label:'Amazon Seller',kind:'marketplace',providers:['amazon_seller','amazon-seller','amazon']},
  {id:'ebay',label:'eBay',kind:'marketplace',providers:['ebay']},
  {id:'woocommerce',label:'WooCommerce',kind:'store',providers:['woocommerce']},
  {id:'tiktok-shop',label:'TikTok Shop',kind:'marketplace',providers:['tiktok-shop','tiktok_shop','tiktokshop']},
  {id:'walmart',label:'Walmart Marketplace',kind:'marketplace',providers:['walmart','walmart-marketplace','walmart_marketplace']},
] as const;

export const DROPSHIP_SUPPLIER_TARGETS:readonly DropshipConnectionTarget[]=[
  {id:'aliexpress',label:'AliExpress / DSers',kind:'supplier',providers:['aliexpress','dsers']},
  {id:'cjdropshipping',label:'CJdropshipping',kind:'supplier',providers:['cjdropshipping','cj-dropshipping']},
  {id:'printful',label:'Printful',kind:'supplier',providers:['printful']},
  {id:'printify',label:'Printify',kind:'supplier',providers:['printify']},
  {id:'gelato',label:'Gelato',kind:'supplier',providers:['gelato']},
  {id:'autods',label:'AutoDS',kind:'supplier',providers:['autods']},
  {id:'zendrop',label:'Zendrop',kind:'supplier',providers:['zendrop']},
  {id:'spocket',label:'Spocket',kind:'supplier',providers:['spocket']},
  {id:'syncee',label:'Syncee',kind:'supplier',providers:['syncee']},
  {id:'shippo',label:'Shippo',kind:'shipping',providers:['shippo']},
  {id:'shipstation',label:'ShipStation',kind:'shipping',providers:['shipstation']},
] as const;

function normalize(value:string){return value.trim().toLowerCase().replace(/^nango_/,'');}

function uniqueActions(rows:DropshipCapability[]){
  const map=new Map<string,DropshipCapability>();
  for(const row of rows){
    const key=`${normalize(row.provider)}:${row.action}`;
    const current=map.get(key);
    if(!current||(!current.deployed&&row.deployed))map.set(key,row);
  }
  return [...map.values()].sort((a,b)=>a.action.localeCompare(b.action));
}

export function buildDropshippingTargetReadiness(target:DropshipConnectionTarget,capabilities:readonly DropshipCapability[]){
  if(target.native){
    return {id:target.id,label:target.label,kind:target.kind,status:'native' as const,connected:true,executable:true,providerIds:[] as string[],deployedActions:1,readActions:1,governedActions:0,actions:[{provider:'blackstar',action:'website_studio_store_build',description:'Create and publish an owned dropshipping storefront through Blackstar Website Studio.',risk:'low' as const,requiresApproval:false,deployed:true,transport:'native',lane:'direct_api'}]};
  }
  const aliases=new Set(target.providers.map(normalize));
  const actions=uniqueActions(capabilities.filter(row=>aliases.has(normalize(row.provider))));
  const deployedActions=actions.filter(row=>row.deployed).length;
  const readActions=actions.filter(row=>row.deployed&&!row.requiresApproval&&row.risk==='low').length;
  const governedActions=actions.filter(row=>row.deployed&&(row.requiresApproval||row.risk!=='low')).length;
  const providerIds=[...new Set(actions.map(row=>normalize(row.provider)))];
  return {
    id:target.id,label:target.label,kind:target.kind,
    status:(deployedActions>0?'ready':actions.length?'configured':'needs_connection') as 'ready'|'configured'|'needs_connection',
    connected:actions.length>0,executable:deployedActions>0,providerIds,deployedActions,readActions,governedActions,
    actions:actions.slice(0,24),
  };
}

export function buildDropshippingReadiness(capabilities:readonly DropshipCapability[]){
  const channels=DROPSHIP_CHANNEL_TARGETS.map(target=>buildDropshippingTargetReadiness(target,capabilities));
  const suppliers=DROPSHIP_SUPPLIER_TARGETS.map(target=>buildDropshippingTargetReadiness(target,capabilities));
  const all=[...channels,...suppliers];
  return {
    channels,suppliers,
    summary:{native:all.filter(row=>row.status==='native').length,ready:all.filter(row=>row.status==='ready').length,configured:all.filter(row=>row.status==='configured').length,needsConnection:all.filter(row=>row.status==='needs_connection').length,deployedActions:all.reduce((sum,row)=>sum+row.deployedActions,0),governedActions:all.reduce((sum,row)=>sum+row.governedActions,0)},
  };
}
