/** Legacy agent-catalogue RPCs backed by the canonical marketplace and its governance. */
import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {writeAuditRequired} from '@/lib/platform/audit.server';
import {slugify,toListingDTO,withCreators,UI_TO_DB_STATUS} from './marketplace.server';
import {MARKETPLACE_LISTING_FEE_PENCE} from './fees';
import {requireMarketplaceModerator,requestCanonicalPublication,decideCanonicalModeration} from './marketplace-governance.server';
import {normaliseAgentWrite} from '@/lib/agents/agents.functions';
type Sb={from:(table:string)=>any};
const idInput=(v:unknown)=>z.object({item_id:z.string().uuid()}).parse(v);
const listingInput=z.object({item_id:z.string().uuid().optional(),title:z.string().trim().min(2).max(80),description:z.string().trim().max(4000).default(''),category:z.string().trim().min(2).max(40),version:z.string().trim().max(20).default('1.0.0'),features:z.array(z.string().trim().max(40)).max(20).default([]),price:z.number().min(0).max(100000).default(0),required_plan:z.enum(['free','pro','business','enterprise']).default('free'),usage_requirements:z.string().trim().max(1000).default(''),revenue_share:z.number().min(0).max(100).optional(),metadata:z.record(z.string(),z.unknown()).default({})});
export const listMarketplaceAgents=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>z.object({category:z.string().optional(),limit:z.number().int().min(1).max(200).optional()}).parse(v??{})).handler(async({data,context})=>{
 const sb=context.supabase as unknown as Sb;let q=sb.from('marketplace_listings').select('*').eq('item_type','agent').eq('status','published').order('published_at',{ascending:false}).limit(data.limit??60);
 if(data.category&&data.category!=='all')q=q.eq('metadata->>category',data.category);
 const {data:rows,error}=await q;if(error)throw new Error(error.message);return withCreators(sb,rows??[]);
});
export const listMyListings=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const sb=context.supabase as unknown as Sb;const {data,error}=await sb.from('marketplace_listings').select('*').eq('seller_id',context.userId).eq('item_type','agent').order('created_at',{ascending:false});if(error)throw new Error(error.message);return withCreators(sb,data??[]);
});
export const listCreatorListings=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>z.object({creator_id:z.string().uuid()}).parse(v)).handler(async({data,context})=>{
 const sb=context.supabase as unknown as Sb;const {data:rows,error}=await sb.from('marketplace_listings').select('*').eq('seller_id',data.creator_id).eq('item_type','agent').eq('status','published').order('published_at',{ascending:false}).limit(60);if(error)throw new Error(error.message);return withCreators(sb,rows??[]);
});
export const saveMarketplaceAgent=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>listingInput.parse(v)).handler(async({data,context})=>{
 const sb=context.supabase as unknown as Sb;const payload={title:data.title,description:data.description,item_type:'agent',tags:data.features,price_pence:Math.round(data.price*100),metadata:{...data.metadata,category:data.category,version:data.version,required_plan:data.required_plan,usage_requirements:data.usage_requirements},updated_at:new Date().toISOString()};
 const query=data.item_id?sb.from('marketplace_listings').update({...payload,status:'draft'}).eq('id',data.item_id).eq('seller_id',context.userId).eq('item_type','agent').in('status',['draft','rejected','unlisted']):sb.from('marketplace_listings').insert({...payload,seller_id:context.userId,slug:`${slugify(data.title)}-${context.userId.slice(0,8)}-${Date.now().toString(36)}`,delivery_type:'digital',listing_fee_pence:MARKETPLACE_LISTING_FEE_PENCE,status:'draft'});
 const {data:row,error}=await query.select('*').maybeSingle();if(error)throw new Error(error.message);if(!row)throw new Error('An owned draft, rejected or unlisted agent listing is required.');return toListingDTO(row);
});
export const submitMarketplaceAgent=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(idInput).handler(async({data,context})=>{
 const result=await requestCanonicalPublication(context.supabase as unknown as Sb,context.userId,data.item_id);return {...toListingDTO(result.listing),publication_next:result.next,marketplace_url:'/creator-marketplace'};
});
export const removeMarketplaceAgent=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(idInput).handler(async({data,context})=>{
 const sb=context.supabase as unknown as Sb;const {data:row,error}=await sb.from('marketplace_listings').update({status:'unlisted',updated_at:new Date().toISOString()}).eq('id',data.item_id).eq('seller_id',context.userId).eq('item_type','agent').eq('status','published').select('*').maybeSingle();if(error)throw new Error(error.message);if(!row)throw new Error('Only an owned published listing can be unlisted.');return toListingDTO(row);
});
export const listReviewQueue=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>z.object({status:z.string().optional()}).parse(v??{})).handler(async({data,context})=>{
 const sb=context.supabase as unknown as Sb;await requireMarketplaceModerator(sb,context.userId);let q=sb.from('marketplace_listings').select('*').eq('item_type','agent').order('created_at',{ascending:false}).limit(200);const status=data.status?UI_TO_DB_STATUS[data.status]:undefined;if(status)q=q.eq('status',status);const {data:rows,error}=await q;if(error)throw new Error(error.message);return withCreators(sb,rows??[]);
});
export const reviewMarketplaceAgent=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>z.object({item_id:z.string().uuid(),action:z.enum(['approve','reject','remove']),notes:z.string().trim().max(1000).optional()}).parse(v)).handler(async({data,context})=>{
 const sb=context.supabase as unknown as Sb;await requireMarketplaceModerator(sb,context.userId);
 if(data.action==='remove'){
  await writeAuditRequired({userId:context.userId,action:'marketplace.admin_unlist_requested',targetType:'marketplace_listing',targetId:data.item_id});
  const {data:row,error}=await sb.from('marketplace_listings').update({status:'unlisted',updated_at:new Date().toISOString()}).eq('id',data.item_id).eq('item_type','agent').eq('status','published').select('*').maybeSingle();if(error||!row)throw new Error('Published agent listing not found.');return toListingDTO(row);
 }
 const {data:agentListing,error:agentError}=await sb.from('marketplace_listings').select('id').eq('id',data.item_id).eq('item_type','agent').maybeSingle();if(agentError||!agentListing)throw new Error('Agent listing not found.');
 const {data:mc,error}=await sb.from('marketplace_moderation_cases').select('id').eq('listing_id',data.item_id).eq('status','pending').order('created_at',{ascending:false}).limit(1).maybeSingle();if(error||!mc)throw new Error('A pending canonical moderation case is required.');
 await decideCanonicalModeration(sb,context.userId,mc.id,data.action==='approve'?'approved':'rejected',data.notes);
 const {data:row,error:readError}=await sb.from('marketplace_listings').select('*').eq('id',data.item_id).eq('item_type','agent').maybeSingle();if(readError||!row)throw new Error('Reviewed listing could not be read.');return toListingDTO(row);
});
export const installMarketplaceAgent=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(idInput).handler(async({data,context})=>{
 const sb=context.supabase as unknown as Sb;const {data:listing,error}=await sb.from('marketplace_listings').select('*').eq('id',data.item_id).eq('item_type','agent').eq('status','published').maybeSingle();if(error||!listing)throw new Error('Published agent listing not found.');
 if(Number(listing.price_pence)>0){const {data:purchase,error:purchaseError}=await sb.from('marketplace_orders').select('id').eq('buyer_id',context.userId).eq('listing_id',listing.id).in('status',['paid','fulfilled']).limit(1).maybeSingle();if(purchaseError||!purchase)throw new Error('Purchase this agent through Creator Marketplace before adding it to your library.');}
 const instructions=typeof listing.metadata?.usage_requirements==='string'?listing.metadata.usage_requirements:'';
 const config=normaliseAgentWrite({name:listing.title,category:typeof listing.metadata?.category==='string'?listing.metadata.category:'custom',description:listing.description,purpose:listing.description,instructions,allowed_tools:[],status:'paused',requires_approval:true,autonomy:'approval_required'});
 const {data:agent,error:insertError}=await sb.from('personal_agents').insert({user_id:context.userId,...config}).select('id,name').maybeSingle();if(insertError||!agent)throw new Error('Agent library creation was not confirmed.');
 return {ok:true,agent,requires_review:true};
});
export const rateMarketplaceAgent=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>z.object({item_id:z.string().uuid(),rating:z.number().int().min(1).max(5),comment:z.string().trim().max(1000).optional()}).parse(v)).handler(async({data,context})=>{
 const sb=context.supabase as unknown as Sb;const {data:order,error}=await sb.from('marketplace_orders').select('id,seller_id').eq('listing_id',data.item_id).eq('buyer_id',context.userId).in('status',['paid','fulfilled']).order('created_at',{ascending:false}).limit(1).maybeSingle();if(error||!order)throw new Error('A matching verified purchase is required to review this listing.');
 const {data:existing,error:lookupError}=await sb.from('marketplace_reviews').select('id').eq('order_id',order.id).eq('buyer_id',context.userId).maybeSingle();if(lookupError)throw new Error(lookupError.message);
 const q=existing?sb.from('marketplace_reviews').update({rating:data.rating,body:data.comment??null,updated_at:new Date().toISOString()}).eq('id',existing.id).eq('buyer_id',context.userId):sb.from('marketplace_reviews').insert({listing_id:data.item_id,order_id:order.id,seller_id:order.seller_id,buyer_id:context.userId,rating:data.rating,body:data.comment??null});
 const {data:receipt,error:writeError}=await q.select('id').maybeSingle();if(writeError||!receipt)throw new Error('Verified review was not confirmed.');return {ok:true,rating:data.rating};
});
export const getCreatorStats=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>z.object({creator_id:z.string().uuid().nullish()}).parse(v??{})).handler(async({data,context})=>{
 const sb=context.supabase as unknown as Sb,creatorId=data.creator_id??context.userId;let listingsQuery=sb.from('marketplace_listings').select('id,title,price_pence,status').eq('seller_id',creatorId).eq('item_type','agent');if(creatorId!==context.userId)listingsQuery=listingsQuery.eq('status','published');const {data:rows,error}=await listingsQuery;if(error)throw new Error(error.message);
 let orders:any[]=[];if(creatorId===context.userId){const result=await sb.from('marketplace_orders').select('listing_id,seller_net_pence').eq('seller_id',context.userId).in('status',['paid','fulfilled']);if(result.error)throw new Error(result.error.message);orders=result.data??[];}
 const agents=(rows??[]).map((r:any)=>({id:r.id,title:r.title,downloads:null,rating:null,earnings:creatorId===context.userId?orders.filter(o=>o.listing_id===r.id).reduce((s:number,o:any)=>s+Number(o.seller_net_pence),0)/100:null}));
 return {agent_count:(rows??[]).filter((r:any)=>r.status==='published').length,total_downloads:null,total_earnings:creatorId===context.userId?agents.reduce((s:number,r:any)=>s+Number(r.earnings),0):null,agents};
});
