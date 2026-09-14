export type CatalogCapability={provider:string;action:string;description?:string;risk?:string;requiresApproval?:boolean;deployed?:boolean;inputSchema?:Record<string,unknown>};

const READ_HINT=/(product|catalog|listing|item|inventory|stock)/i;
const BLOCK_HINT=/(order|receipt|customer|contact|message|refund|payout|payment|fulfill|shipment|shipping address|address)/i;
const CREDENTIAL_KEY=/(token|secret|password|authorization|api[_-]?key|cookie)/i;

export function isDropshippingCatalogReadCapability(capability:CatalogCapability){
  if(!capability?.deployed||capability.requiresApproval||String(capability.risk||'').toLowerCase()!=='low')return false;
  const text=`${capability.action||''} ${capability.description||''}`;
  return READ_HINT.test(text)&&!BLOCK_HINT.test(text);
}

export function assertNoCatalogCredentials(value:unknown,depth=0){
  if(depth>8)throw new Error('Catalog input is nested too deeply.');
  if(Array.isArray(value)){if(value.length>200)throw new Error('Catalog input contains too many array items.');for(const item of value)assertNoCatalogCredentials(item,depth+1);return;}
  if(!value||typeof value!=='object')return;
  for(const [key,child] of Object.entries(value as Record<string,unknown>)){
    if(CREDENTIAL_KEY.test(key))throw new Error('Credentials belong in Blackstar Integrations, not catalog read input.');
    assertNoCatalogCredentials(child,depth+1);
  }
}

function schemaRecord(value:unknown){return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{}}
export function buildCatalogReadInputTemplate(schema:unknown){
  const root=schemaRecord(schema);const properties=schemaRecord(root['properties']);const requiredRaw=root['required'];const required=new Set(Array.isArray(requiredRaw)?requiredRaw.map(String):[]);
  const out:Record<string,unknown>={};
  for(const [key,raw] of Object.entries(properties).slice(0,30)){
    const row=schemaRecord(raw);const type=String(row['type']||'');
    if(key==='limit')out[key]=Math.min(25,Number(row['maximum'])||25);
    else if(key==='offset')out[key]=0;
    else if(type==='boolean')out[key]=false;
    else if(required.has(key)){
      if(type==='integer'||type==='number')out[key]=1;
      else out[key]='REQUIRED_VALUE';
    }
  }
  return out;
}

export type CatalogCandidate={sourceId:string|null;name:string;sku:string|null;category:string|null;description:string|null;vendor:string|null;price:number|null;currency:string|null;inventory:number|null;url:string|null};
const asObject=(v:unknown)=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:null;
const str=(...values:unknown[])=>{for(const value of values){if(typeof value==='string'&&value.trim())return value.trim().slice(0,5000)}return null};
const id=(...values:unknown[])=>{for(const value of values){if(typeof value==='string'&&value.trim())return value.trim().slice(0,300);if(typeof value==='number'&&Number.isFinite(value))return String(value)}return null};
const num=(...values:unknown[])=>{for(const value of values){const n=Number(value);if(Number.isFinite(n))return n}return null};

function candidateFrom(row:Record<string,unknown>):CatalogCandidate|null{
  const name=str(row['title'],row['name'],row['product_name'],row['listing_title']);
  if(!name)return null;
  const money=asObject(row['price'])||asObject(row['shopMoney'])||asObject(asObject(row['currentTotalPriceSet'])?.shopMoney);
  const price=num(row['price'],row['amount'],money?.['amount']);
  return {
    sourceId:id(row['id'],row['product_id'],row['listing_id'],row['sku']),
    name:name.slice(0,180),
    sku:str(row['sku'],row['SKU']),
    category:str(row['productType'],row['product_type'],row['category'],row['taxonomy_path']),
    description:str(row['description'],row['description']Html,row['description']_html),
    vendor:str(row['vendor'],row['brand'],row['shop_name']),
    price,
    currency:str(row['currency'],row['currency']Code,money?.['currencyCode'],money?.['currency_code']),
    inventory:num(row['inventoryQuantity'],row['totalInventory'],row['quantity'],row['stock']),
    url:str(row['url'],row['web_url'],row['listing_url']),
  };
}

export function extractDropshippingCatalogCandidates(value:unknown,max=100):CatalogCandidate[]{
  const out:CatalogCandidate[]=[];const seen=new Set<unknown>();let visited=0;
  const visit=(node:unknown,depth:number)=>{
    if(out.length>=max||depth>7||visited++>3000||node==null)return;
    if(typeof node!=='object')return;
    if(seen.has(node))return;seen.add(node);
    if(Array.isArray(node)){for(const child of node.slice(0,300))visit(child,depth+1);return;}
    const row=node as Record<string,unknown>;const candidate=candidateFrom(row);
    if(candidate){
      const key=`${candidate.sourceId||''}:${candidate.name}`;
      if(!out.some(item=>`${item.sourceId||''}:${item.name}`===key))out.push(candidate);
    }
    for(const child of Object.values(row).slice(0,120))visit(child,depth+1);
  };
  visit(value,0);return out.slice(0,max);
}
