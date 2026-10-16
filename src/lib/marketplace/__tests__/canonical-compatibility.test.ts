import {beforeEach,describe,expect,it,vi} from 'vitest';import {createFakeSupabase} from '@/lib/runtime/__tests__/fake-supabase';
const h=vi.hoisted(()=>({admin:{} as any,audit:vi.fn(),stripe:{} as any}));
vi.mock('@tanstack/react-start',()=>({createServerFn:()=>{let validate=(v:any)=>v;const chain={middleware:()=>chain,inputValidator:(f:any)=>{validate=f;return chain;},handler:(fn:any)=>(args:any)=>fn({...args,data:validate(args.data)})};return chain;}}));
vi.mock('@/integrations/supabase/auth-middleware',()=>({requireSupabaseAuth:()=>null}));
vi.mock('@/integrations/supabase/client.server',()=>({get supabaseAdmin(){return h.admin;}}));
vi.mock('@/lib/platform/audit.server',()=>({writeAuditRequired:h.audit}));
vi.mock('../stripe.server',()=>({marketplaceBaseUrl:()=> 'https://app.example',marketplaceStripe:()=>h.stripe}));
import {listMarketplaceAgents,saveMarketplaceAgent,installMarketplaceAgent,rateMarketplaceAgent,getCreatorStats,reviewMarketplaceAgent} from '../marketplace.functions';
import {requestCanonicalPublication,decideCanonicalModeration} from '../marketplace-governance.server';
import {startMarketplaceSellerOnboarding,refreshMarketplaceSellerStripeStatus} from '../marketplace-connect.functions';
import {listBillingEvents} from '@/lib/billing/billing.functions';
const seller='00000000-0000-4000-8000-000000000001',buyer='00000000-0000-4000-8000-000000000002',listing='00000000-0000-4000-8000-000000000011',order='00000000-0000-4000-8000-000000000021';let sb:any,context:any;
beforeEach(()=>{vi.clearAllMocks();h.audit.mockResolvedValue('audit');h.admin={rpc:vi.fn(async()=>({data:{ok:true,listing:{id:listing}},error:null}))};
 sb=createFakeSupabase({marketplace_listings:[{id:listing,seller_id:seller,title:'Fixture agent',description:'Reference',item_type:'agent',status:'published',price_pence:1000,metadata:{category:'science',agent_config:{tools:['send_email']},usage_requirements:'Review this reference'},published_at:'2026-10-16'}],marketplace_orders:[],marketplace_seller_profiles:[{user_id:seller,display_name:'Creator',verification_status:'unverified'}],marketplace_reviews:[],marketplace_admins:[],personal_agents:[]});context={userId:buyer,supabase:sb};
 h.stripe={accounts:{create:vi.fn(async()=>({id:'acct_fixture'})),retrieve:vi.fn(async()=>({details_submitted:true,charges_enabled:true,payouts_enabled:true}))},accountLinks:{create:vi.fn(async()=>({url:'https://connect.stripe.example/fixture'}))}};
});
describe('canonical marketplace compatibility',()=>{
 it('reads canonical published agent rows, real reviews and seller verification',async()=>{
  sb.tables.marketplace_reviews.push({listing_id:listing,rating:4});const result=await (listMarketplaceAgents as any)({context,data:{}});expect(result[0]).toMatchObject({id:listing,creator_id:seller,creator_name:'Creator',rating:4,reviews_count:1,revenue_share:2,downloads:null,metadata:{verified:false}});expect(sb.tables.marketplace_agents).toBeUndefined();expect(sb.tables.creator_profiles).toBeUndefined();
 });
 it('does not bypass payment for a priced agent',async()=>{
  await expect((installMarketplaceAgent as any)({context,data:{item_id:listing}})).rejects.toThrow('Purchase this agent');expect(sb.tables.personal_agents).toHaveLength(0);
 });
 it.each(['pending','refunded','disputed','cancelled'])('does not accept a %s order',async status=>{
  sb.tables.marketplace_orders.push({id:order,buyer_id:buyer,listing_id:listing,status});await expect((installMarketplaceAgent as any)({context,data:{item_id:listing}})).rejects.toThrow('Purchase this agent');
 });
 it('creates purchased agents paused with no tools and requires review',async()=>{
  sb.tables.marketplace_orders.push({id:order,buyer_id:buyer,listing_id:listing,status:'paid'});expect(await (installMarketplaceAgent as any)({context,data:{item_id:listing}})).toMatchObject({ok:true,requires_review:true});expect(sb.tables.personal_agents[0]).toMatchObject({user_id:buyer,status:'paused',allowed_tools:[],requires_approval:true,autonomy:'approval_required'});expect(sb.tables.personal_agents[0].allowed_tools).not.toContain('send_email');
 });
 it('does not use another buyer purchase as installation evidence',async()=>{
  sb.tables.marketplace_orders.push({id:order,buyer_id:seller,listing_id:listing,status:'paid'});await expect((installMarketplaceAgent as any)({context,data:{item_id:listing}})).rejects.toThrow('Purchase this agent');
 });
 it('cannot create a review without a matching owned paid order',async()=>{
  await expect((rateMarketplaceAgent as any)({context,data:{item_id:listing,rating:5}})).rejects.toThrow('verified purchase');expect(sb.tables.marketplace_reviews).toHaveLength(0);
 });
 it('binds review identity to the canonical order rather than browser seller fields',async()=>{
  sb.tables.marketplace_orders.push({id:order,buyer_id:buyer,seller_id:seller,listing_id:listing,status:'fulfilled'});await (rateMarketplaceAgent as any)({context,data:{item_id:listing,rating:5,comment:'Fixture'}});expect(sb.tables.marketplace_reviews[0]).toMatchObject({order_id:order,buyer_id:buyer,seller_id:seller,listing_id:listing,rating:5});
 });
 it('does not let a seller-selected revenue share change canonical fees',async()=>{
  context.userId=seller;const result=await (saveMarketplaceAgent as any)({context,data:{title:'Draft agent',category:'science',price:10,revenue_share:99}});expect(result.revenue_share).toBe(2);const draft=sb.tables.marketplace_listings[1];expect(draft).toMatchObject({seller_id:seller,item_type:'agent',status:'draft',listing_fee_pence:300});expect(draft.revenue_share).toBeUndefined();
 });
 it('does not modify a published listing through draft editing',async()=>{
  context.userId=seller;await expect((saveMarketplaceAgent as any)({context,data:{item_id:listing,title:'Edited agent',category:'science',price:1}})).rejects.toThrow('owned draft');expect(sb.tables.marketplace_listings[0].price_pence).toBe(1000);
 });
 it('returns unlisted edits to draft so publication requires review again',async()=>{
  context.userId=seller;sb.tables.marketplace_listings[0].status='unlisted';await (saveMarketplaceAgent as any)({context,data:{item_id:listing,title:'Edited agent',category:'science',price:1}});expect(sb.tables.marketplace_listings[0].status).toBe('draft');expect(sb.tables.marketplace_listings[0].price_pence).toBe(100);
 });
 it('reports actual owned paid seller-net earnings including unpublished history',async()=>{
  context.userId=seller;sb.tables.marketplace_listings[0].status='unlisted';sb.tables.marketplace_orders.push({listing_id:listing,seller_id:seller,status:'paid',seller_net_pence:980},{listing_id:listing,seller_id:seller,status:'refunded',seller_net_pence:980});const stats=await (getCreatorStats as any)({context,data:{}});expect(stats.total_earnings).toBe(9.8);expect(stats.agent_count).toBe(0);expect(stats.total_downloads).toBeNull();
 });
 it('does not expose seller private earnings through public creator stats',async()=>{
  const stats=await (getCreatorStats as any)({context,data:{creator_id:seller}});expect(stats.total_earnings).toBeNull();
 });
 it('requires canonical marketplace allowlisting for moderation',async()=>{
  await expect((reviewMarketplaceAgent as any)({context,data:{item_id:listing,action:'approve'}})).rejects.toThrow('administrator access');expect(h.admin.rpc).not.toHaveBeenCalled();
 });
 it('requires owner proof and persisted audit before publication RPC',async()=>{
  await expect(requestCanonicalPublication(sb,buyer,listing)).rejects.toThrow('unavailable to this seller');expect(h.admin.rpc).not.toHaveBeenCalled();h.audit.mockRejectedValue(new Error('audit unavailable'));await expect(requestCanonicalPublication(sb,seller,listing)).rejects.toThrow('audit unavailable');expect(h.admin.rpc).not.toHaveBeenCalled();
 });
 it('requires audit before an allowlisted atomic moderation decision',async()=>{
  sb.tables.marketplace_admins.push({user_id:buyer});h.audit.mockRejectedValue(new Error('audit unavailable'));await expect(decideCanonicalModeration(sb,buyer,order,'approved')).rejects.toThrow('audit unavailable');expect(h.admin.rpc).not.toHaveBeenCalled();
 });
 it('does not create Stripe accounts when required audit fails',async()=>{
  context.userId=seller;h.audit.mockRejectedValue(new Error('audit unavailable'));await expect((startMarketplaceSellerOnboarding as any)({context})).rejects.toThrow('audit unavailable');expect(h.stripe.accounts.create).not.toHaveBeenCalled();
 });
 it('records Stripe account ownership only through server storage before returning an onboarding link',async()=>{
  context.userId=seller;h.admin=createFakeSupabase({marketplace_seller_profiles:sb.tables.marketplace_seller_profiles});
  const result=await (startMarketplaceSellerOnboarding as any)({context});expect(result.url).toContain('connect.stripe.example');expect(h.admin.tables.marketplace_seller_profiles[0].stripe_connected_account_id).toBe('acct_fixture');expect(sb.tables.marketplace_seller_profiles[0].stripe_connected_account_id).toBeUndefined();
  const options=h.stripe.accounts.create.mock.calls[0]?.[1];expect(options.idempotencyKey).toMatch(/^marketplace-connect-[a-f0-9]{64}$/);expect(options.idempotencyKey).not.toContain(seller);expect(h.audit.mock.invocationCallOrder[0]!).toBeLessThan(h.stripe.accounts.create.mock.invocationCallOrder[0]!);
 });
 it('writes verified Stripe readiness through server storage without caller fallback',async()=>{
  context.userId=seller;sb.tables.marketplace_seller_profiles[0].stripe_connected_account_id='acct_fixture';h.admin=createFakeSupabase({marketplace_seller_profiles:sb.tables.marketplace_seller_profiles});
  await (refreshMarketplaceSellerStripeStatus as any)({context});expect(h.admin.tables.marketplace_seller_profiles[0].stripe_payouts_enabled).toBe(true);expect(sb.tables.marketplace_seller_profiles[0].stripe_payouts_enabled).toBeUndefined();
 });
 it('reads billing purchase amounts from canonical buyer-owned orders',async()=>{
  sb.tables.marketplace_orders.push({id:order,buyer_id:buyer,sale_price_pence:1250,currency:'GBP',status:'paid',created_at:'2026-10-16'},{id:'other',buyer_id:seller,sale_price_pence:90000,status:'paid'});
  const result=await (listBillingEvents as any)({context,data:{}});expect(result.events).toHaveLength(1);expect(result.events[0].amount).toBe(12.5);expect(sb.tables.marketplace_purchases).toBeUndefined();
 });
});
