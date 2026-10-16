import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const h=vi.hoisted(()=>({admin:{from:vi.fn(),storage:{from:vi.fn()}},fetch:vi.fn()}));
vi.mock('@tanstack/react-start',()=>({createServerFn:()=>{
 let validate=(v:any)=>v;const chain={middleware:()=>chain,inputValidator:(f:any)=>{validate=f;return chain;},handler:(fn:any)=>(args:any)=>fn({...args,data:validate(args.data)})};return chain;
}}));
vi.mock('@/integrations/supabase/auth-middleware',()=>({requireSupabaseAuth:()=>null}));
vi.mock('@/integrations/supabase/client.server',()=>({supabaseAdmin:h.admin}));
import {beginTrustedMediaUpload,finalizeTrustedMediaUpload,listTrustedMediaAssets} from '../trusted-media.functions';
import {getTrustedVideoAsset} from '../trusted-media.server';
import {TRUSTED_MEDIA_MAX_BYTES} from '../trusted-media-policy';
import {mp4Fixture} from './mp4-fixtures';
const owner='00000000-0000-4000-8000-000000000001',assetId='00000000-0000-4000-8000-000000000011';
const context={userId:owner,supabase:{from:vi.fn()}};
function fixture(patch:Record<string,unknown>={}){
 const state={asset:{id:assetId,user_id:owner,object_path:`${owner}/${assetId}/fixture.mp4`,filename:'fixture.mp4',mime_type:'video/mp4',bucket:'trusted-media',status:'uploading',size_bytes:null,duration_seconds:null,verified_at:null,...patch},writes:[] as any[],filters:[] as any[],insertError:false};
 h.admin.from.mockImplementation(()=>{
  let operation='read',payload:any;const filters:any[]=[];
  const result=()=>{
   if(operation==='insert'){if(state.insertError)return {data:null,error:{message:'Invalid API key'}};state.asset={...state.asset,...payload};return {data:state.asset,error:null};}
   if(filters.some(([key,value])=>state.asset[key as keyof typeof state.asset]!==value))return {data:null,error:null};
   if(operation==='update'){state.writes.push(payload);state.asset={...state.asset,...payload};}return {data:state.asset,error:null};
  };
  const q:any={select:()=>q,eq:(key:string,value:unknown)=>{filters.push([key,value]);state.filters.push([key,value]);return q;},
   insert:(row:any)=>{operation='insert';payload=row;return q;},update:(row:any)=>{operation='update';payload=row;return q;},single:async()=>result(),maybeSingle:async()=>result(),then:(resolve:any)=>Promise.resolve(result()).then(resolve)};return q;
 });
 h.admin.storage.from.mockReturnValue({createSignedUploadUrl:vi.fn(async()=>({data:{signedUrl:'https://storage.example.test/upload'},error:null})),createSignedUrl:vi.fn(async()=>({data:{signedUrl:'https://storage.example.test/read'},error:null}))});
 return state;
}
const mp4=mp4Fixture;
const response=(bytes:Uint8Array=mp4(),total=bytes.length,type='video/mp4')=>new Response(bytes as BodyInit,{status:206,headers:{'content-range':`bytes 0-${bytes.length-1}/${total}`,'content-type':type}});
beforeEach(()=>{vi.clearAllMocks();vi.stubGlobal('fetch',h.fetch);h.fetch.mockImplementation(async()=>response());});afterEach(()=>vi.unstubAllGlobals());
describe('trusted media verification authority',()=>{
 it('creates the ledger and signed upload only through the authenticated server path',async()=>{
  const s=fixture();await expect((beginTrustedMediaUpload as any)({context,data:{filename:'fixture.mp4',mimeType:'video/mp4'}})).resolves.toMatchObject({assetId,objectPath:`${owner}/${assetId}/fixture.mp4`});
  expect(context.supabase.from).not.toHaveBeenCalled();expect(h.admin.storage.from).toHaveBeenCalledWith('trusted-media');expect(s.filters).toContainEqual(['user_id',owner]);
 });
 it('does not fall back to caller writes when the privileged credential fails',async()=>{
  const s=fixture();s.insertError=true;await expect((beginTrustedMediaUpload as any)({context,data:{filename:'fixture.mp4',mimeType:'video/mp4'}})).rejects.toMatchObject({message:'Invalid API key'});expect(context.supabase.from).not.toHaveBeenCalled();expect(h.admin.storage.from).not.toHaveBeenCalled();
 });
 it('persists ready only after structured MP4 container metadata is verified',async()=>{
  const s=fixture();await expect((finalizeTrustedMediaUpload as any)({context,data:{assetId}})).resolves.toMatchObject({status:'ready',size_bytes:mp4().length,duration_seconds:2});
  expect(h.fetch).toHaveBeenCalledTimes(1);expect(s.writes[0]).toMatchObject({status:'ready',size_bytes:mp4().length,duration_seconds:2});expect(s.asset.verified_at).toBeTruthy();expect(context.supabase.from).not.toHaveBeenCalled();
 });
 it.each(['mime','duration','size'])('never certifies invalid %s evidence',async kind=>{
  const s=fixture();const bytes=kind==='duration'?new Uint8Array(32):mp4();h.fetch.mockResolvedValue(response(bytes,kind==='size'?TRUSTED_MEDIA_MAX_BYTES+1:bytes.length,kind==='mime'?'audio/mpeg':'video/mp4'));
  await expect((finalizeTrustedMediaUpload as any)({context,data:{assetId}})).rejects.toThrow();expect(s.writes.some(w=>w.status==='ready')).toBe(false);expect(s.writes.at(-1)).toMatchObject({status:'invalid'});
 });
 it('rejects a path inconsistent with its owner and asset before reading storage',async()=>{
  const s=fixture({object_path:'another-owner/another-asset/video.mp4'});await expect((finalizeTrustedMediaUpload as any)({context,data:{assetId}})).rejects.toThrow('does not match');expect(h.fetch).not.toHaveBeenCalled();expect(s.writes).toEqual([]);
 });
 it('does not read or verify an asset for another owner',async()=>{
  fixture({user_id:'another-owner'});await expect((finalizeTrustedMediaUpload as any)({context,data:{assetId}})).rejects.toThrow('not found');expect(h.fetch).not.toHaveBeenCalled();
 });
 it('cancels an oversized storage response instead of buffering unbounded bytes',async()=>{
  const s=fixture(),cancel=vi.fn();h.fetch.mockResolvedValue(new Response(new ReadableStream({start(controller){controller.enqueue(new Uint8Array(4*1024*1024+1));},cancel}),{status:206,headers:{'content-range':'bytes 0-4194304/5000000','content-type':'video/mp4'}}));
  await expect((finalizeTrustedMediaUpload as any)({context,data:{assetId}})).rejects.toThrow('bounded verification range');expect(cancel).toHaveBeenCalled();expect(s.writes.some(w=>w.status==='ready')).toBe(false);
 });
 it.each([null,'invalid-date'])('rejects ready records without valid verification time: %s',async verified=>{
  fixture({status:'ready',verified_at:verified,size_bytes:32,duration_seconds:2});await expect((finalizeTrustedMediaUpload as any)({context,data:{assetId}})).rejects.toThrow('metadata is incomplete');expect(h.fetch).not.toHaveBeenCalled();
 });
 it('retains a verified ready record without replacing its bytes',async()=>{
  const s=fixture({status:'ready',verified_at:'2026-10-16T10:00:00Z',size_bytes:32,duration_seconds:2});await expect((finalizeTrustedMediaUpload as any)({context,data:{assetId}})).resolves.toMatchObject({status:'ready'});expect(h.fetch).not.toHaveBeenCalled();expect(s.writes).toEqual([]);
 });
 it('requires verification evidence when resolving an asset for a publishing provider',async()=>{
  fixture({status:'ready',size_bytes:32,duration_seconds:2});await expect(getTrustedVideoAsset(owner,assetId)).rejects.toThrow('metadata is incomplete');
 });
 it('returns an owner-scoped verified provider asset',async()=>{
  fixture({status:'ready',verified_at:'2026-10-16T10:00:00Z',size_bytes:32,duration_seconds:2});await expect(getTrustedVideoAsset(owner,assetId)).resolves.toMatchObject({id:assetId,userId:owner,sizeBytes:32,durationSeconds:2});
 });
 it('keeps owner listing on the caller RLS client',async()=>{
  const q:any={select:()=>q,eq:()=>q,order:()=>q,limit:async()=>({data:[],error:null})};context.supabase.from.mockReturnValue(q);await expect((listTrustedMediaAssets as any)({context,data:{limit:25}})).resolves.toEqual([]);expect(context.supabase.from).toHaveBeenCalledWith('trusted_media_assets');expect(h.admin.from).not.toHaveBeenCalled();
 });
});
