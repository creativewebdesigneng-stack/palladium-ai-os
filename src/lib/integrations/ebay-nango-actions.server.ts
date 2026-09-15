import {
  getOwnedNangoConnection,
  proxyOwnedNangoRequest,
  type SafeNangoRequest,
} from "./nango.server";

export type EbayNangoCapability={
  provider:"ebay";
  action:string;
  description:string;
  risk:"low"|"medium"|"high";
  requiresApproval:boolean;
  deployed:true;
  inputSchema:Record<string,unknown>;
};

type Definition=EbayNangoCapability&{buildRequest(input:Record<string,unknown>):SafeNangoRequest};

const objectSchema=(properties:Record<string,unknown>,required:string[]=[])=>({type:"object",properties,required,additionalProperties:false});
const CREDENTIAL_KEY=/(token|secret|password|authorization|api[_-]?key|cookie)/i;

function boundedString(input:Record<string,unknown>,key:string,max:number,required=false){
  const raw=input[key];
  if(raw==null){if(required)throw new Error(`${key} is required.`);return undefined;}
  if(typeof raw!=="string")throw new Error(`${key} must be a string.`);
  const value=raw.trim();
  if(required&&!value)throw new Error(`${key} is required.`);
  if(value.length>max)throw new Error(`${key} exceeds the ${max} character limit.`);
  return value||undefined;
}
function boundedInt(input:Record<string,unknown>,key:string,fallback:number,min:number,max:number){
  const raw=input[key];
  if(raw==null||raw==="")return fallback;
  const value=Number(raw);
  if(!Number.isSafeInteger(value)||value<min||value>max)throw new Error(`${key} must be an integer between ${min} and ${max}.`);
  return value;
}
function safePath(value:string,label:string,max=120){
  if(!value||value.length>max||/[/?#]/.test(value))throw new Error(`Invalid eBay ${label}.`);
  return encodeURIComponent(value);
}
function safeBody(input:Record<string,unknown>,key:string,allowed:readonly string[],maxBytes=48_000){
  const raw=input[key];
  if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new Error(`${key} must be an object.`);
  const row=raw as Record<string,unknown>;
  const extras=Object.keys(row).filter(name=>!allowed.includes(name));
  if(extras.length)throw new Error(`${key} contains unsupported fields: ${extras.slice(0,5).join(", ")}.`);
  const serialized=JSON.stringify(row);
  if(serialized.length>maxBytes)throw new Error(`${key} exceeds the ${maxBytes} byte limit.`);
  if(CREDENTIAL_KEY.test(serialized))throw new Error("Credentials cannot be supplied in eBay action input.");
  return serialized;
}

const ACTIONS:readonly Definition[]=[
  {
    provider:"ebay",action:"ebay_inventory_items_list",
    description:"List the connected seller's eBay Inventory API items with bounded pagination.",
    risk:"low",requiresApproval:false,deployed:true,
    inputSchema:objectSchema({limit:{type:"integer",minimum:1,maximum:100},offset:{type:"integer",minimum:0,maximum:10000}}),
    buildRequest(input){
      const query=new URLSearchParams({limit:String(boundedInt(input,"limit",25,1,100)),offset:String(boundedInt(input,"offset",0,0,10000))});
      return {url:`https://nango.invalid/sell/inventory/v1/inventory_item?${query}`,method:"GET"};
    },
  },
  {
    provider:"ebay",action:"ebay_inventory_item_get",
    description:"Read one eBay inventory item by seller SKU.",
    risk:"low",requiresApproval:false,deployed:true,
    inputSchema:objectSchema({sku:{type:"string",minLength:1,maxLength:50}},["sku"]),
    buildRequest(input){
      const sku=safePath(boundedString(input,"sku",50,true)!,"SKU",50);
      return {url:`https://nango.invalid/sell/inventory/v1/inventory_item/${sku}`,method:"GET"};
    },
  },
  {
    provider:"ebay",action:"ebay_orders_list",
    description:"List completed-checkout eBay orders for fulfilment and support context.",
    risk:"low",requiresApproval:false,deployed:true,
    inputSchema:objectSchema({limit:{type:"integer",minimum:1,maximum:200},offset:{type:"integer",minimum:0,maximum:10000},filter:{type:"string",maxLength:500}}),
    buildRequest(input){
      const query=new URLSearchParams({limit:String(boundedInt(input,"limit",25,1,200)),offset:String(boundedInt(input,"offset",0,0,10000))});
      const filter=boundedString(input,"filter",500);
      if(filter)query.set("filter",filter);
      return {url:`https://nango.invalid/sell/fulfillment/v1/order?${query}`,method:"GET"};
    },
  },
  {
    provider:"ebay",action:"ebay_inventory_item_put",
    description:"Create or replace one eBay inventory item. This changes seller inventory and requires approval.",
    risk:"medium",requiresApproval:true,deployed:true,
    inputSchema:objectSchema({
      sku:{type:"string",minLength:1,maxLength:50},
      inventory_item:{type:"object",additionalProperties:false},
    },["sku","inventory_item"]),
    buildRequest(input){
      const sku=safePath(boundedString(input,"sku",50,true)!,"SKU",50);
      const body=safeBody(input,"inventory_item",["availability","condition","conditionDescription","packageWeightAndSize","product"]);
      return {url:`https://nango.invalid/sell/inventory/v1/inventory_item/${sku}`,method:"PUT",headers:{"Content-Type":"application/json"},body};
    },
  },
  {
    provider:"ebay",action:"ebay_offer_create",
    description:"Create an unpublished eBay offer for an existing inventory item. Approval is required.",
    risk:"medium",requiresApproval:true,deployed:true,
    inputSchema:objectSchema({offer:{type:"object",additionalProperties:false}},["offer"]),
    buildRequest(input){
      const body=safeBody(input,"offer",["sku","marketplaceId","format","availableQuantity","categoryId","listingDescription","merchantLocationKey","pricingSummary","listingPolicies","quantityLimitPerBuyer","tax"]);
      return {url:"https://nango.invalid/sell/inventory/v1/offer",method:"POST",headers:{"Content-Type":"application/json"},body};
    },
  },
  {
    provider:"ebay",action:"ebay_offer_publish",
    description:"Publish an existing eBay offer into a live marketplace listing. This is a high-impact approved action.",
    risk:"high",requiresApproval:true,deployed:true,
    inputSchema:objectSchema({offer_id:{type:"string",minLength:1,maxLength:120}},["offer_id"]),
    buildRequest(input){
      const offerId=safePath(boundedString(input,"offer_id",120,true)!,"offer ID");
      return {url:`https://nango.invalid/sell/inventory/v1/offer/${offerId}/publish`,method:"POST",headers:{"Content-Type":"application/json"},body:"{}"};
    },
  },
];

export function listEbayNangoCapabilities():EbayNangoCapability[]{
  return ACTIONS.map(({buildRequest:_buildRequest,...capability})=>capability);
}
export function isEbayNangoAction(action:string){return ACTIONS.some(item=>item.action===action);}
function definitionFor(action:string){
  const definition=ACTIONS.find(item=>item.action===action);
  if(!definition)throw new Error(`Unsupported bounded eBay action: ${action}.`);
  return definition;
}
async function assertConnected(userId:string){
  const connection=await getOwnedNangoConnection(userId,"ebay");
  if(!connection||(connection.persisted&&connection.persisted.status!=="connected"))throw new Error("eBay is not connected through Nango.");
}
export async function prepareEbayNangoAction(input:{userId:string;action:string;actionInput:Record<string,unknown>}){
  const definition=definitionFor(input.action);
  definition.buildRequest(input.actionInput);
  await assertConnected(input.userId);
  return {provider:"ebay" as const,action:definition.action,description:definition.description,risk:definition.risk,requiresApproval:definition.requiresApproval,input:input.actionInput};
}
export async function executeEbayNangoAction(input:{userId:string;action:string;actionInput:Record<string,unknown>;signal?:AbortSignal}){
  const definition=definitionFor(input.action);
  const request=definition.buildRequest(input.actionInput);
  await assertConnected(input.userId);
  const result=await proxyOwnedNangoRequest(input.userId,"ebay",request,input.signal);
  return {ok:true as const,provider:"ebay" as const,result};
}
