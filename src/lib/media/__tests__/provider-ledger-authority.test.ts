import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {createFakeSupabase} from '@/lib/runtime/__tests__/fake-supabase';
const h=vi.hoisted(()=>({admin:{} as any,audit:vi.fn(),submit:vi.fn(),refresh:vi.fn(),isAdmin:vi.fn(),provider:vi.fn()}));
vi.mock('@tanstack/react-start',()=>({createServerFn:()=>{let validate=(v:any)=>v;const chain={middleware:()=>chain,inputValidator:(f:any)=>{validate=f;return chain;},handler:(fn:any)=>(args:any)=>fn({...args,data:validate(args.data)})};return chain;}}));
vi.mock('@/integrations/supabase/auth-middleware',()=>({requireSupabaseAuth:()=>null}));
vi.mock('@/integrations/supabase/client.server',()=>({get supabaseAdmin(){return h.admin;}}));
vi.mock('@/lib/platform/audit.server',()=>({writeAuditRequired:h.audit,writeAudit:vi.fn()}));
vi.mock('@/lib/media/media-runtime.server',()=>({submitAutoEditorJob:h.submit,getAutoEditorJob:h.refresh,getMediaRuntimeCapabilities:()=>({})}));
vi.mock('@/lib/marketplace/marketplace.server',()=>({isPlatformAdmin:h.isAdmin}));
vi.mock('@/lib/security/provider-http.server',async()=>{const actual=await vi.importActual<any>('@/lib/security/provider-http.server');return {...actual,requestProviderJson:h.provider};});
import {createMediaEditJob,refreshMediaEditJob} from '../media-studio.functions';
import {saveDeploymentTarget,triggerCoolifyDeployment} from '@/lib/deployments/coolify.functions';
const owner='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002',jobId='00000000-0000-4000-8000-000000000011';
let caller:any;let context:any;
afterEach(()=>vi.unstubAllEnvs());
const data={inputName:'Fixture',sourceUrl:'https://media.example/a.mp4',mode:'silence',threshold:.1,marginBeforeMs:100,marginAfterMs:100,outputFormat:'mp4'};
beforeEach(()=>{vi.clearAllMocks();h.audit.mockResolvedValue('audit-1');h.isAdmin.mockResolvedValue(false);h.provider.mockResolvedValue({ok:true});h.submit.mockResolvedValue({workerJobId:'worker-1',status:'queued',outputUrl:null});h.refresh.mockResolvedValue({status:'running'});
 caller=createFakeSupabase({media_edit_jobs:[{id:jobId,user_id:owner,worker_job_id:'worker-1'}],deployment_targets:[{id:jobId,user_id:owner,provider:'coolify',resource_kind:'application',resource_uuid:'resource-1'}]});h.admin=createFakeSupabase({media_edit_jobs:caller.tables.media_edit_jobs});context={userId:owner,supabase:caller};});
describe('provider ledger authority',()=>{
 it('persists new worker identity only through the server after required audit',async()=>{
  const result=await (createMediaEditJob as any)({context,data});expect(result.workerJobId).toBe('worker-1');expect(caller.tables.media_edit_jobs).toHaveLength(1);expect(h.admin.tables.media_edit_jobs).toHaveLength(2);
  expect(h.audit.mock.invocationCallOrder[0]!).toBeLessThan(h.submit.mock.invocationCallOrder[0]!);
 });
 it('does not dispatch a job if ledger creation fails',async()=>{
  h.admin.from=()=>{const q:any={insert:()=>q,select:()=>q,single:async()=>({error:{message:'Invalid API key'}})};return q;};
  await expect((createMediaEditJob as any)({context,data})).rejects.toThrow('could not be confirmed');expect(h.submit).not.toHaveBeenCalled();
 });
 it('does not dispatch a job when required audit fails',async()=>{
  h.audit.mockRejectedValue(new Error('Required audit unavailable'));await expect((createMediaEditJob as any)({context,data})).rejects.toThrow('Required audit');expect(h.submit).not.toHaveBeenCalled();
 });
 it('never polls a job belonging to another owner',async()=>{
  context.userId=other;await expect((refreshMediaEditJob as any)({context,data:{id:jobId}})).rejects.toThrow('access denied');expect(h.refresh).not.toHaveBeenCalled();
 });
 it('polls only server-recorded IDs and writes the matching owner receipt',async()=>{
  await (refreshMediaEditJob as any)({context,data:{id:jobId}});expect(h.refresh).toHaveBeenCalledWith('worker-1');expect(h.admin.tables.media_edit_jobs[0].status).toBe('running');expect(caller.tables.media_edit_jobs[0].status).toBeUndefined();
 });
 it('denies shared Coolify target creation and actions to ordinary users',async()=>{
  await expect((saveDeploymentTarget as any)({context,data:{name:'Fixture',resourceKind:'application',resourceUuid:'resource-1'}})).rejects.toThrow('administrator access');
  await expect((triggerCoolifyDeployment as any)({context,data:{id:jobId,action:'deploy'}})).rejects.toThrow('administrator access');expect(h.provider).not.toHaveBeenCalled();
 });
 it('denies another owner target even for an admin',async()=>{
  h.isAdmin.mockResolvedValue(true);context.userId=other;await expect((triggerCoolifyDeployment as any)({context,data:{id:jobId,action:'stop'}})).rejects.toThrow('not found');expect(h.provider).not.toHaveBeenCalled();
 });
 it('requires audit before an admin provider action',async()=>{
  h.isAdmin.mockResolvedValue(true);h.audit.mockRejectedValue(new Error('audit unavailable'));await expect((triggerCoolifyDeployment as any)({context,data:{id:jobId,action:'stop'}})).rejects.toThrow('audit unavailable');expect(h.provider).not.toHaveBeenCalled();
 });
 it('dispatches the exact owned admin target after audit using the server credential',async()=>{
  vi.stubEnv('COOLIFY_API_URL','https://coolify.example');vi.stubEnv('COOLIFY_API_TOKEN','fixture-token');h.isAdmin.mockResolvedValue(true);
  await expect((triggerCoolifyDeployment as any)({context,data:{id:jobId,action:'deploy'}})).resolves.toEqual({ok:true,result:{ok:true}});
  expect(h.provider.mock.calls[0]?.[0].toString()).toBe('https://coolify.example/api/v1/deploy?uuid=resource-1&force=false');expect(h.provider.mock.calls[0]?.[1]).toBe('fixture-token');expect(h.audit.mock.invocationCallOrder[0]!).toBeLessThan(h.provider.mock.invocationCallOrder[0]!);
 });
});
