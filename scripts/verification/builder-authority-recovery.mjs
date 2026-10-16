import {readFileSync,readdirSync} from 'node:fs';import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();let passed=0;const check=(v,m)=>{assert.ok(v,m);passed++;};const rows=async q=>(await db.query(q)).rows;const denied=async q=>{await assert.rejects(()=>db.query(q));passed++;};const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,a=id(1),b=id(2),job=id(11),otherJob=id(12),dep=id(21),approval=id(31);
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema private;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create table public.approval_requests(id uuid primary key,user_id uuid,status text,action_type text,details jsonb);grant usage on schema public,auth,private to service_role;grant usage on schema public,auth to anon,authenticated;grant all on approval_requests to service_role;insert into auth.users values('${a}'),('${b}');`);
const file=readdirSync('supabase/migrations').find(n=>n.endsWith('_restore_builder_execution_authority.sql'));await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
for(const table of ['builder_jobs','builder_deployments']){
 check((await rows(`select relrowsecurity from pg_class where oid='${table}'::regclass`))[0].relrowsecurity,'RLS');check((await rows(`select * from ${table}`)).length===0,'no backfill');
 for(const role of ['anon','authenticated'])for(const privilege of ['INSERT','UPDATE','DELETE','TRUNCATE'])check(!(await rows(`select has_table_privilege('${role}','${table}','${privilege}') ok`))[0].ok,'no caller mutation');
 check(!(await rows(`select has_table_privilege('anon','${table}','SELECT') ok`))[0].ok,'no anonymous access');
}
await db.exec(`set role service_role;insert into builder_jobs(id,user_id,title,prompt) values('${job}','${a}','Fixture','Fixture'),('${otherJob}','${b}','Other','Other');`);
const deployment=(i=dep,user=a)=>`insert into builder_deployments(id,user_id,builder_job_id,status) values('${i}','${user}','${job}','uploading')`;
await denied(deployment());await db.exec(`update builder_jobs set source_status='generated',source_manifest='{"files":[]}',repository_status='files_applied' where id='${job}'`);await denied(deployment());
await db.exec(`update builder_jobs set sandbox_status='passed' where id='${job}'`);await denied(deployment(dep,b));await db.exec(deployment());passed++;
await denied(deployment(id(22)));await denied(`update builder_deployments set user_id='${b}',builder_job_id='${otherJob}' where id='${dep}'`);await denied(`update builder_jobs set repair_attempt=11 where id='${job}'`);
await db.exec(`reset role;set role authenticated;set request.jwt.claim.sub='${a}'`);
check((await rows('select id from builder_jobs')).length===1,'other owner source hidden');check((await rows('select id from builder_deployments')).length===1,'owned deployment visible');await denied(`update builder_jobs set sandbox_status='passed'`);await denied(`update builder_deployments set production_status='approved'`);await denied('delete from builder_jobs');await denied(deployment(id(24)));
await db.exec(`reset role;set role service_role;update builder_deployments set status='ready',provider_deployment_id='dpl_fixture',provider_project_id='prj_fixture' where id='${dep}'`);
await denied(`update builder_deployments set production_status='approved' where id='${dep}'`);
const details={deployment_id:'dpl_fixture',project_id:'prj_fixture',builder_deployment_id:dep,builder_job_id:job,target:'production'};
await db.exec(`insert into approval_requests values('${approval}','${a}','pending','vercel_production_promote','${JSON.stringify(details)}');update builder_deployments set production_approval_id='${approval}',production_status='approval_pending' where id='${dep}'`);
await denied(`update builder_deployments set production_status='approved' where id='${dep}'`);
await db.exec(`update approval_requests set status='approved',action_type='other'`);await denied(`update builder_deployments set production_status='approved' where id='${dep}'`);
await db.exec(`update approval_requests set action_type='vercel_production_promote',user_id='${b}'`);await denied(`update builder_deployments set production_status='approved' where id='${dep}'`);await db.exec(`update approval_requests set user_id='${a}'`);
for(const field of Object.keys(details)){
 await db.exec(`update approval_requests set details='${JSON.stringify({...details,[field]:'mismatch'})}'`);
 await denied(`update builder_deployments set production_status='approved' where id='${dep}'`);
}
await db.exec(`update approval_requests set details='${JSON.stringify(details)}';update builder_deployments set production_status='approved' where id='${dep}';update builder_deployments set production_status='promoting' where id='${dep}';update builder_deployments set production_status='promoted',production_promoted_at=now() where id='${dep}'`);
check((await rows(`select production_status from builder_deployments where id='${dep}'`))[0].production_status==='promoted','exact approved promotion transition');
await denied(`update builder_deployments set provider_project_id='different' where id='${dep}'`);
await db.exec(`update builder_deployments set status='failed',last_error='Later provider failure' where id='${dep}'`);
check((await rows(`select status,production_status from builder_deployments where id='${dep}'`))[0].status==='failed','later provider state can refresh without rewriting promotion history');
check(!(await rows("select prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='enforce_builder_execution_proof'"))[0].prosecdef,'invoker proof trigger');
await db.exec(`reset role;set role anon`);await denied('select * from builder_jobs');await denied('select * from builder_deployments');
await db.exec(`reset role;delete from auth.users where id='${a}'`);check((await rows('select * from builder_deployments')).length===0,'owner deletion cascades own deployment');check((await rows('select * from builder_jobs')).length===1,'other owner retained');
await db.close();console.log(`Builder recovery: ${passed} isolated Postgres authorization checks passed.`);
