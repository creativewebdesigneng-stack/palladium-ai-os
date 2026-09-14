import {DROPSHIP_SUPPLIER_TARGETS,type DropshipCapability} from './dropshipping-readiness';

type Row=Record<string,unknown>;

export const DROPSHIP_FULFILMENT_TARGET_IDS=DROPSHIP_SUPPLIER_TARGETS.map(row=>row.id);

function record(value:unknown):Row{return value&&typeof value==='object'&&!Array.isArray(value)?value as Row:{};}
function text(value:unknown){return typeof value==='string'?value.trim():'';}
export function normalizeDropshipProvider(value:unknown){return text(value).toLowerCase().replace(/^nango_/,'');}

export function fulfilmentTargetForProvider(provider:string){
  const normalized=normalizeDropshipProvider(provider);
  return DROPSHIP_SUPPLIER_TARGETS.find(target=>target.providers.some(alias=>normalizeDropshipProvider(alias)===normalized))??null;
}

export function providerCanFulfilDropship(provider:string){
  return Boolean(fulfilmentTargetForProvider(provider));
}

export function orderLineItemIds(order:Row){
  const rows=Array.isArray(order['line_items'])?order['line_items']:[];
  return [...new Set(rows.map(raw=>{
    const item=record(raw);
    return text(item['item_id'])||text(item['catalog_item_id'])||text(item['product_id']);
  }).filter(Boolean))];
}

export function orderHasDropshipProduct(order:Row,catalog:Row[]){
  const ids=new Set(orderLineItemIds(order));
  if(!ids.size)return false;
  return catalog.some(item=>{
    const id=text(item['id']);
    const metadata=record(item['metadata']);
    return ids.has(id)&&(metadata['source']==='dropshipping-hub'||metadata['businessModel']==='dropshipping'||metadata['business_model']==='dropshipping');
  });
}

export function buildFulfilmentCapabilityRows(capabilities:readonly DropshipCapability[]){
  return capabilities
    .filter(row=>providerCanFulfilDropship(row.provider)&&row.deployed)
    .map(row=>({...row,targetId:fulfilmentTargetForProvider(row.provider)?.id??null}))
    .sort((a,b)=>a.provider===b.provider?a.action.localeCompare(b.action):a.provider.localeCompare(b.provider));
}
