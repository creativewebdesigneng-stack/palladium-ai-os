import {readFileSync,readdirSync} from 'node:fs';import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();let passed=0;const check=(v,m)=>{assert.ok(v,m);passed++;};const rows=async q=>(await db.query(q)).rows;const denied=async q=>{await assert.rejects(()=>db.query(q));passed++;};
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,a=id(1),b=id(2),jobA=id(11),jobB=id(12),targetA=id(21),targetB=id(22);
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to anon,authenticated,service_role;insert into auth.users values('${a}'),('${b}');`);
const file=readdirSync('supabase/migrations').find(n=>n.endsWith('_restore_provider_job_authority.sql'));const sql=readFileSync('supabase/migrations/'+file,'utf8');await db.exec(sql);await assert.rejects(()=>db.exec(sql),/requires both tables absent/);passed++;
for(const table of ['media_edit_jobs','deployment_targets']){
 check((await rows(`select relrowsecurity from pg_class where oid='${table}'::regclass`))[0].relrowsecurity,'RLS enabled');check((await rows(`select * from ${table}`)).length===0,'no provider jobs or targets backfilled');
 for(const role of ['anon','authenticated'])for(const priv of ['INSERT','UPDATE','DELETE','TRUNCATE'])check(!(await rows(`select has_table_privilege('${role}','${table}','${priv}') ok`))[0].ok,`${role} denied ${priv}`);
 check(!(await rows(`select has_table_privilege('anon','${table}','SELECT') ok`))[0].ok,'anonymous read denied');
}
const job=(i,user,worker)=>`insert into media_edit_jobs(id,user_id,input_name,source_url,mode,output_format,worker_job_id) values('${i}','${user}','Fixture','https://media.example/a.mp4','silence','mp4','${worker}')`;
const target=(i,user)=>`insert into deployment_targets(id,user_id,name,resource_uuid) values('${i}','${user}','Fixture','resource-${i}')`;
await db.exec(`set role service_role;${job(jobA,a,'worker-a')};${job(jobB,b,'worker-b')};${target(targetA,a)};${target(targetB,b)};`);
await denied(job(id(13),a,'worker-b'));await denied(`update media_edit_jobs set threshold=2 where id='${jobA}'`);await denied(`update media_edit_jobs set margin_before_ms=-1 where id='${jobA}'`);await denied(`update media_edit_jobs set status='forged' where id='${jobA}'`);await denied(`update deployment_targets set provider='arbitrary' where id='${targetA}'`);await denied(`update deployment_targets set resource_kind='server' where id='${targetA}'`);
await db.exec(`reset role;set role authenticated;set request.jwt.claim.sub='${a}'`);
check((await rows('select id from media_edit_jobs'))[0].id===jobA&&(await rows('select id from media_edit_jobs')).length===1,'only owned worker ledger visible');
check((await rows('select id from deployment_targets'))[0].id===targetA&&(await rows('select id from deployment_targets')).length===1,'only owned targets visible');
await denied(job(id(14),a,'forged-worker'));await denied(`update media_edit_jobs set worker_job_id='worker-b' where id='${jobA}'`);await denied('delete from media_edit_jobs');await denied(target(id(23),a));await denied(`update deployment_targets set resource_uuid='other' where id='${targetA}'`);await denied('delete from deployment_targets');
await db.exec('reset role;set role anon');await denied('select * from media_edit_jobs');await denied('select * from deployment_targets');
await db.exec(`reset role;set role service_role;update media_edit_jobs set status='running' where id='${jobA}';`);
check((await rows(`select status from media_edit_jobs where id='${jobA}'`))[0].status==='running','trusted server updates retained');
await db.exec(`reset role;delete from auth.users where id='${a}'`);check((await rows('select * from media_edit_jobs')).length===1,'owner deletion removes own media');check((await rows('select * from deployment_targets')).length===1,'owner deletion removes own targets');
await db.close();console.log(`Provider job recovery: ${passed} isolated Postgres authorization checks passed.`);
