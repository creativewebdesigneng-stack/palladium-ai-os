import {beforeEach,describe,expect,it,vi} from 'vitest';
import {createFakeSupabase} from '@/lib/runtime/__tests__/fake-supabase';
const h=vi.hoisted(()=>({admin:{} as any}));
vi.mock('@tanstack/react-start',()=>({createServerFn:()=>{let validate=(v:any)=>v;const chain={middleware:()=>chain,inputValidator:(f:any)=>{validate=f;return chain;},handler:(fn:any)=>(args:any)=>fn({...args,data:validate(args.data)})};return chain;}}));
vi.mock('@/integrations/supabase/auth-middleware',()=>({requireSupabaseAuth:()=>null}));
vi.mock('@/integrations/supabase/client.server',()=>({get supabaseAdmin(){return h.admin;}}));
import {createApiKeyFn,rotateApiKeyFn,revokeApiKeyFn,listApiKeysFn,getApiUsageFn} from '../devapi.functions';
let caller:any;let context:any;
beforeEach(()=>{
 caller=createFakeSupabase({subscriptions:[],api_keys:[{id:'own',user_id:'owner',name:'Owned',environment:'test',revoked_at:null,expires_at:null},{id:'other',user_id:'other',name:'Other',revoked_at:null,expires_at:null}],api_request_logs:[]});
 h.admin=createFakeSupabase({api_keys:caller.tables.api_keys});h.admin.rpc=vi.fn(async()=>({data:{id:'new',name:'New'},error:null}));context={userId:'owner',supabase:caller};
});
describe('developer key management authority',()=>{
 it('uses only the caller personal subscription and atomically creates through the server',async()=>{
  caller.tables.subscriptions.push({user_id:'other',org_id:null,plan_code:'enterprise',status:'active'});
  const result=await (createApiKeyFn as any)({context,data:{name:'New'}});
  expect(result.key).toMatch(/^pk_live_/);expect(h.admin.rpc.mock.calls[0]).toMatchObject(['create_developer_api_key',{p_user_id:'owner',p_max_keys:1,p_scopes:['agents:read','tasks:read']}]);
  expect(JSON.stringify(h.admin.rpc.mock.calls)).not.toContain(result.key);expect(caller.tables.api_keys).toHaveLength(2);
 });
 it('does not return raw material when secure creation fails',async()=>{
  h.admin.rpc.mockResolvedValue({data:null,error:{message:'Invalid API key'}});
  await expect((createApiKeyFn as any)({context,data:{name:'New'}})).rejects.toThrow('Could not securely create');
 });
 it('honours the serialized key quota receipt',async()=>{
  h.admin.rpc.mockResolvedValue({data:{error:'key_quota_exceeded'},error:null});
  await expect((createApiKeyFn as any)({context,data:{name:'New'}})).rejects.toThrow('1 active API key');
 });
 it.each([{revoked_at:'2026-01-01'},{expires_at:'2020-01-01'}])('never revives an inactive key %j',async patch=>{
  Object.assign(caller.tables.api_keys[0],patch);
  await expect((rotateApiKeyFn as any)({context,data:{key_id:'own'}})).rejects.toThrow('cannot be rotated');
 });
 it('cannot rotate or revoke another owner key',async()=>{
  await expect((rotateApiKeyFn as any)({context,data:{key_id:'other'}})).rejects.toThrow('no longer exists');
  await expect((revokeApiKeyFn as any)({context,data:{key_id:'other'}})).rejects.toThrow('not confirmed');
  expect(h.admin.tables.api_keys[1].revoked_at).toBeNull();
 });
 it('rotates only through the server without resetting usage or expiry',async()=>{
  h.admin.tables.api_keys[0].request_count=6;
  await (rotateApiKeyFn as any)({context,data:{key_id:'own'}});
  expect(h.admin.tables.api_keys[0].key_hash).toHaveLength(64);expect(h.admin.tables.api_keys[0].request_count).toBe(6);expect(caller.tables.api_keys[0].key_hash).toBeUndefined();
 });
 it('lists only owned metadata',async()=>{
  expect((await (listApiKeysFn as any)({context})).keys.map((k:any)=>k.id)).toEqual(['own']);
 });
 it.each([listApiKeysFn,getApiUsageFn])('reports plan storage errors instead of fabricated empty data',async fn=>{
  const from=caller.from;caller.from=(table:string)=>{
   if(table!=='subscriptions')return from(table);const q:any=new Proxy({},{get:(_,k)=>k==='then'?(r:any)=>Promise.resolve({error:{message:'offline'},data:null}).then(r):()=>q});return q;
  };await expect((fn as any)({context})).rejects.toThrow('Could not verify');
 });
});
