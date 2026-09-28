import {
  getOwnedNangoConnection,
  proxyOwnedNangoRequest,
  type SafeNangoRequest,
} from "./nango.server";

export type WooCommerceNangoCapability={
  provider:"woocommerce";
  action:string;
  description:string;
  risk:"low"|"medium"|"high";
  requiresApproval:boolean;
  deployed:true;
  inputSchema:Record<string,unknown>;
};
type Definition=WooCommerceNangoCapability&{buildRequest(input:Record<string,unknown>):SafeNangoRequest};
const objectSchema=(properties:Record<string,unknown>,required:string[]=[])=>({type:"object",properties,required,additionalProperties:false});
const CREDENTIAL_KEY=/(token|secret|password|authorization|consumer[_-]?(key|secret)|api[_-]?key|cookie)/i;

function boundedString(input:Record<string,unknown>,key:string,max:number,required=false){
  const raw=input[key];
  if(raw==null){if(required)throw new Error(`${key} is required.`);return undefined;}
  if(typeof raw!=="string")throw new Error(`${key} must be a string.`);
  const value=raw.trim();
  if(required&&!value)throw new Error(`${key} is required.`);
  if(value.length>max)throw new Error(`${key} exceeds the ${max} character limit.`);
  return value||undefined;
}
function positiveId(input:Record<string,unknown>,key:string){
  const value=Number(input[key]);
  if(!Number.isSafeInteger(value)||value<1)throw new Error(`${key} must be a positive integer.`);
  return value;
}
function boundedInt(input:Record<string,unknown>,key:string,fallback:number,min:number,max:number){
  const raw=input[key];
  if(raw==null||raw==="")return fallback;
  const value=Number(raw);
  if(!Number.isSafeInteger(value)||value<min||value>max)throw new Error(`${key} must be an integer between ${min} and ${max}.`);
  return value;
}
function safeBody(input:Record<string,unknown>,key:string,allowed:readonly string[],maxBytes=48_000){
  const raw=input[key];
  if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new Error(`${key} must be an object.`);
  const row=raw as Record<string,unknown>;
  const extras=Object.keys(row).filter(name=>!allowed.includes(name));
  if(extras.length)throw new Error(`${key} contains unsupported fields: ${extras.slice(0,5).join(", ")}.`);
  const serialized=JSON.stringify(row);
  if(serialized.length>maxBytes)throw new Error(`${key} exceeds the ${maxBytes} byte limit.`);
  if(CREDENTIAL_KEY.test(serialized))throw new Error("Credentials cannot be supplied in WooCommerce action input.");
  return serialized;
}
function queryString(input:Record<string,unknown>){
  const query=new URLSearchParams({per_page:String(boundedInt(input,"per_page",25,1,100)),page:String(boundedInt(input,"page",1,1,10000))});
  const search=boundedString(input,"search",200);
  const status=boundedString(input,"status",30);
  if(search)query.set("search",search);
  if(status)query.set("status",status);
  return query.toString();
}
const PRODUCT_FIELDS=["name","type","status","catalog_visibility","description","short_description","sku","regular_price","sale_price","manage_stock","stock_quantity","backorders","categories","images","tags","attributes","variations","shipping_class"] as const;
const ORDER_FIELDS=["status","customer_note","billing","shipping","line_items","shipping_lines","fee_lines","coupon_lines","meta_data","set_paid"] as const;

const ACTIONS:readonly Definition[]=[
  {
    provider:"woocommerce",action:"woocommerce_products_list",
    description:"List WooCommerce REST API v3 products with bounded pagination and search.",
    risk:"low",requiresApproval:false,deployed:true,
    inputSchema:objectSchema({per_page:{type:"integer",minimum:1,maximum:100},page:{type:"integer",minimum:1,maximum:10000},search:{type:"string",maxLength:200},status:{type:"string",maxLength:30}}),
    buildRequest(input){return {url:`https://nango.invalid/wp-json/wc/v3/products?${queryString(input)}`,method:"GET"};},
  },
  {
    provider:"woocommerce",action:"woocommerce_product_get",
    description:"Read one WooCommerce product by numeric product ID.",
    risk:"low",requiresApproval:false,deployed:true,
    inputSchema:objectSchema({product_id:{type:"integer",minimum:1}},["product_id"]),
    buildRequest(input){return {url:`https://nango.invalid/wp-json/wc/v3/products/${positiveId(input,"product_id")}`,method:"GET"};},
  },
  {
    provider:"woocommerce",action:"woocommerce_orders_list",
    description:"List WooCommerce orders for fulfilment and support context.",
    risk:"low",requiresApproval:false,deployed:true,
    inputSchema:objectSchema({per_page:{type:"integer",minimum:1,maximum:100},page:{type:"integer",minimum:1,maximum:10000},search:{type:"string",maxLength:200},status:{type:"string",maxLength:30}}),
    buildRequest(input){return {url:`https://nango.invalid/wp-json/wc/v3/orders?${queryString(input)}`,method:"GET"};},
  },
  {
    provider:"woocommerce",action:"woocommerce_product_create",
    description:"Create a WooCommerce product through REST API v3. External publication requires approval.",
    risk:"medium",requiresApproval:true,deployed:true,
    inputSchema:objectSchema({product:{type:"object",additionalProperties:false}},["product"]),
    buildRequest(input){return {url:"https://nango.invalid/wp-json/wc/v3/products",method:"POST",headers:{"Content-Type":"application/json"},body:safeBody(input,"product",PRODUCT_FIELDS)};},
  },
  {
    provider:"woocommerce",action:"woocommerce_product_update",
    description:"Update bounded fields on an existing WooCommerce product. Approval is required.",
    risk:"medium",requiresApproval:true,deployed:true,
    inputSchema:objectSchema({product_id:{type:"integer",minimum:1},product:{type:"object",additionalProperties:false}},["product_id","product"]),
    buildRequest(input){return {url:`https://nango.invalid/wp-json/wc/v3/products/${positiveId(input,"product_id")}`,method:"PUT",headers:{"Content-Type":"application/json"},body:safeBody(input,"product",PRODUCT_FIELDS)};},
  },
  {
    provider:"woocommerce",action:"woocommerce_order_update",
    description:"Update bounded WooCommerce order fields such as status or fulfilment metadata. Approval is required.",
    risk:"high",requiresApproval:true,deployed:true,
    inputSchema:objectSchema({order_id:{type:"integer",minimum:1},order:{type:"object",additionalProperties:false}},["order_id","order"]),
    buildRequest(input){return {url:`https://nango.invalid/wp-json/wc/v3/orders/${positiveId(input,"order_id")}`,method:"PUT",headers:{"Content-Type":"application/json"},body:safeBody(input,"order",ORDER_FIELDS)};},
  },
];

export function listWooCommerceNangoCapabilities():WooCommerceNangoCapability[]{
  return ACTIONS.map(({buildRequest:_buildRequest,...capability})=>capability);
}
export function isWooCommerceNangoAction(action:string){return ACTIONS.some(item=>item.action===action);}
function definitionFor(action:string){
  const definition=ACTIONS.find(item=>item.action===action);
  if(!definition)throw new Error(`Unsupported bounded WooCommerce action: ${action}.`);
  return definition;
}
async function assertConnected(userId:string){
  const connection=await getOwnedNangoConnection(userId,"woocommerce");
  if(!connection||(connection.persisted&&connection.persisted.status!=="connected"))throw new Error("WooCommerce is not connected through Nango.");
}
export async function prepareWooCommerceNangoAction(input:{userId:string;action:string;actionInput:Record<string,unknown>}){
  const definition=definitionFor(input.action);
  definition.buildRequest(input.actionInput);
  await assertConnected(input.userId);
  return {provider:"woocommerce" as const,action:definition.action,description:definition.description,risk:definition.risk,requiresApproval:definition.requiresApproval,input:input.actionInput};
}
export async function executeWooCommerceNangoAction(input:{userId:string;action:string;actionInput:Record<string,unknown>;signal?:AbortSignal}){
  const definition=definitionFor(input.action);
  const request=definition.buildRequest(input.actionInput);
  await assertConnected(input.userId);
  const result=await proxyOwnedNangoRequest(input.userId,"woocommerce",request,input.signal);
  return {ok:true as const,provider:"woocommerce" as const,result};
}
