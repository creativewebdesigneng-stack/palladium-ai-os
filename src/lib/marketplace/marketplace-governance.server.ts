import {writeAuditRequired} from '@/lib/platform/audit.server';
type Sb={from:(table:string)=>any};
export async function requireMarketplaceModerator(sb:Sb,userId:string){
 const {data,error}=await sb.from('marketplace_admins').select('user_id').eq('user_id',userId).maybeSingle();
 if(error||!data)throw new Error('Marketplace administrator access required.');
}
export async function requestCanonicalPublication(sb:Sb,userId:string,listingId:string){
 const {data:owned,error}=await sb.from('marketplace_listings').select('id').eq('id',listingId).eq('seller_id',userId).maybeSingle();
 if(error||!owned)throw new Error('Listing not found or unavailable to this seller.');
 await writeAuditRequired({userId,action:'marketplace.publication_requested',targetType:'marketplace_listing',targetId:listingId});
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 const {data,error:writeError}=await (supabaseAdmin as any).rpc('request_marketplace_publication',{p_user_id:userId,p_listing_id:listingId});
 if(writeError||!data?.listing?.id)throw new Error('Marketplace publication request was not confirmed.');
 return data;
}
export async function decideCanonicalModeration(sb:Sb,userId:string,caseId:string,decision:string,notes?:string){
 await requireMarketplaceModerator(sb,userId);
 await writeAuditRequired({userId,action:'marketplace.moderation_requested',targetType:'marketplace_moderation_case',targetId:caseId,metadata:{decision}});
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 const {data,error}=await (supabaseAdmin as any).rpc('decide_marketplace_moderation',{p_actor_id:userId,p_case_id:caseId,p_decision:decision,p_notes:notes||null});
 if(error||!data?.ok)throw new Error('Marketplace moderation decision was not confirmed.');
 return data;
}
