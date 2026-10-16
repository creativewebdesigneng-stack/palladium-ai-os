import {beforeEach,describe,expect,it,vi} from 'vitest';import {createFakeSupabase} from '@/lib/runtime/__tests__/fake-supabase';
const h=vi.hoisted(()=>({admin:{} as any,plan:vi.fn(),preview:vi.fn(),promote:vi.fn(),audit:vi.fn()}));
vi.mock('@tanstack/react-start',()=>({createServerFn:()=>{let validate=(v:any)=>v;const chain={middleware:()=>chain,inputValidator:(f:any)=>{validate=f;return chain;},handler:(fn:any)=>(args:any)=>fn({...args,data:validate(args.data)})};return chain;}}));
vi.mock('@/integrations/supabase/auth-middleware',()=>({requireSupabaseAuth:()=>null}));
vi.mock('@/integrations/supabase/client.server',()=>({get supabaseAdmin(){return h.admin;}}));
vi.mock('../builder-plan.server',()=>({generateBuilderPlan:h.plan}));
vi.mock('../builder-deploy-vercel.server',()=>({createVercelPreviewDeployment:h.preview,getVercelDeployment:vi.fn(),promoteVercelDeployment:h.promote}));
vi.mock('@/lib/platform/audit.server',()=>({writeAuditRequired:h.audit}));
import {createBuilderJob,generateBuilderJobPlan,cancelBuilderJob} from '../builder.functions';
import {createBuilderPreviewDeployment,promoteBuilderDeploymentToProduction} from '../builder-deploy.functions';
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002',job='00000000-0000-4000-8000-000000000011',dep='00000000-0000-4000-8000-000000000021',approval='00000000-0000-4000-8000-000000000031';let caller:any,context:any;
beforeEach(()=>{vi.clearAllMocks();h.plan.mockResolvedValue({steps:[]});h.audit.mockResolvedValue('audit');h.promote.mockResolvedValue({aliases:[]});
 const jobs=[{id:job,user_id:a,title:'Fixture',prompt:'Build a fixture application',status:'requested',source_status:'generated',source_manifest:{files:[]},repository_status:'files_applied',sandbox_status:'passed'}];
 const deployments=[{id:dep,user_id:a,builder_job_id:job,provider:'vercel',target:'preview',status:'ready',production_status:'approved',production_approval_id:approval,provider_project_id:'prj_fixture',provider_deployment_id:'dpl_fixture'}];
 caller=createFakeSupabase({builder_jobs:jobs,builder_deployments:deployments,user_ai_preferences:[],approval_requests:[{id:approval,user_id:a,status:'approved',action_type:'vercel_production_promote',details:{deployment_id:'dpl_fixture',project_id:'prj_fixture',builder_deployment_id:dep,builder_job_id:job,target:'production'}}]});h.admin=createFakeSupabase({builder_jobs:jobs,builder_deployments:deployments});context={userId:a,supabase:caller};
});
describe('Builder execution authority',()=>{
 it('creates jobs only through server storage with verified identity',async()=>{
  await (createBuilderJob as any)({context,data:{title:'Fixture',prompt:'Build a fixture application'}});expect(h.admin.tables.builder_jobs).toHaveLength(2);expect(h.admin.tables.builder_jobs[1].user_id).toBe(a);expect(caller.tables.builder_jobs).toHaveLength(1);
 });
 it('does not fall back to caller writes after server storage failure',async()=>{
  h.admin.from=()=>{const q:any={insert:()=>q,select:()=>q,single:async()=>({error:{message:'Invalid API key'}})};return q;};await expect((createBuilderJob as any)({context,data:{title:'Fixture',prompt:'Build a fixture application'}})).rejects.toThrow('Invalid API key');expect(caller.tables.builder_jobs).toHaveLength(1);
 });
 it('denies another owner planning or cancellation before provider calls',async()=>{
  context.userId=b;await expect((generateBuilderJobPlan as any)({context,data:{id:job}})).rejects.toThrow('no longer ready');await expect((cancelBuilderJob as any)({context,data:{id:job}})).rejects.toThrow('no longer pending');expect(h.plan).not.toHaveBeenCalled();expect(h.admin.tables.builder_jobs[0].status).toBe('requested');
 });
 it('claims and persists owned planning through the server while reading preferences as caller',async()=>{
  await (generateBuilderJobPlan as any)({context,data:{id:job}});expect(h.admin.tables.builder_jobs[0].status).toBe('planned');expect(caller.tables.builder_jobs[0].status).toBe('requested');expect(h.plan).toHaveBeenCalledTimes(1);
 });
 it('denies another owner preview before any deployment call',async()=>{
  context.userId=b;await expect((createBuilderPreviewDeployment as any)({context,data:{id:job}})).rejects.toThrow('pass isolated validation');expect(h.preview).not.toHaveBeenCalled();
 });
 it('requires sandbox validation before preview',async()=>{
  caller.tables.builder_jobs[0].sandbox_status='failed';await expect((createBuilderPreviewDeployment as any)({context,data:{id:job}})).rejects.toThrow('pass isolated validation');expect(h.preview).not.toHaveBeenCalled();
 });
 it('requires audit before provider preview creation',async()=>{
  h.audit.mockRejectedValue(new Error('Required audit unavailable'));await expect((createBuilderPreviewDeployment as any)({context,data:{id:job}})).rejects.toThrow('preview deployment failed');expect(h.preview).not.toHaveBeenCalled();
 });
 it('rejects an approved request of the wrong action type',async()=>{
  caller.tables.approval_requests[0].action_type='other';await expect((promoteBuilderDeploymentToProduction as any)({context,data:{id:dep}})).rejects.toThrow('not been granted');expect(h.promote).not.toHaveBeenCalled();
 });
 it.each(['builder_job_id','builder_deployment_id','project_id','deployment_id','target'])('rejects mismatched production approval %s',async field=>{
  caller.tables.approval_requests[0].details[field]='different';await expect((promoteBuilderDeploymentToProduction as any)({context,data:{id:dep}})).rejects.toThrow('does not match');expect(h.promote).not.toHaveBeenCalled();
 });
 it('denies promotion when required audit cannot persist',async()=>{
  h.audit.mockRejectedValue(new Error('Required audit unavailable'));await expect((promoteBuilderDeploymentToProduction as any)({context,data:{id:dep}})).rejects.toThrow('promotion failed');expect(h.promote).not.toHaveBeenCalled();
 });
 it('promotes only the exact approved owned deployment after claiming server state',async()=>{
  await (promoteBuilderDeploymentToProduction as any)({context,data:{id:dep}});expect(h.promote).toHaveBeenCalledWith({projectId:'prj_fixture',deploymentId:'dpl_fixture'});expect(h.admin.tables.builder_deployments[0].production_status).toBe('promoted');expect(caller.tables.builder_deployments[0].production_status).toBe('approved');expect(h.audit.mock.invocationCallOrder[0]!).toBeLessThan(h.promote.mock.invocationCallOrder[0]!);
 });
});
