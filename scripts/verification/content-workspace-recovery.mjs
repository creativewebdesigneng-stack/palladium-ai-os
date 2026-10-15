// Isolated real Postgres fixtures; never calls a provider or production database.
import {readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();let passed=0;
const check=(v,m)=>{assert.ok(v,m);passed++;};
const denied=async q=>{await assert.rejects(()=>db.query(q));passed++;};
const rows=async q=>(await db.query(q)).rows;
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const a=id(1),b=id(2),org=id(11),otherOrg=id(12);
const templates={
 saved_prompts:n=>({name:'Fixture prompt',prompt_text:'Fixture text'}),
 saved_prompt_versions:n=>({prompt_id:id(n+1),version:1,name:'Fixture version',prompt_text:'Snapshot'}),
 saved_prompt_runs:n=>({prompt_id:id(n+1),prompt_version:1}),
 smart_tables:n=>({name:'Fixture table',org_id:org}),
 smart_table_records:n=>({table_id:id(n+4)}),
 smart_table_views:n=>({table_id:id(n+4),name:'Grid'}),
 zen_notes:n=>({org_id:org,knowledge_document_id:id(n===100?21:22)}),
 html_studio_documents:n=>({org_id:org,source_note_id:id(n+7)}),
 seo_projects:n=>({org_id:org,name:'Fixture SEO',domain:'example.test'}),
 seo_snapshots:n=>({project_id:id(n+9),kind:'audit',subject:'Fixture observation'}),
 task_focus_sessions:n=>({task_source:'personal_tasks',task_id:id(n===100?31:32)}),
};
const tables=Object.keys(templates);
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
create schema auth;create schema private;
create table auth.users(id uuid primary key);
create table memory_documents(id uuid primary key,user_id uuid);create table personal_tasks(id uuid primary key,user_id uuid);create table agent_tasks(id uuid primary key,user_id uuid);
create table private.members(user_id uuid,org_id uuid);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function private.is_org_member(_org uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from private.members where user_id=auth.uid() and org_id=_org) $$;
grant usage on schema auth,private,public to anon,authenticated,service_role;
grant execute on function auth.uid() to authenticated,anon;grant execute on function private.is_org_member(uuid) to authenticated;
grant select on memory_documents,personal_tasks,agent_tasks to authenticated;
insert into auth.users values('${a}'),('${b}');insert into private.members values('${a}','${org}'),('${b}','${org}');
insert into memory_documents values('${id(21)}','${a}'),('${id(22)}','${b}');
insert into personal_tasks values('${id(31)}','${a}'),('${id(32)}','${b}');
insert into agent_tasks values('${id(41)}','${a}'),('${id(42)}','${b}');`);
const file=readdirSync('supabase/migrations').find(n=>n.endsWith('_restore_content_workspace.sql'));
const migration=readFileSync('supabase/migrations/'+file,'utf8');await db.exec(migration);
await assert.rejects(()=>db.exec(migration),/requires all eleven tables absent/);passed++;
for(const t of tables){
 check((await rows(`select relrowsecurity from pg_class where oid='${t}'::regclass`))[0].relrowsecurity,'RLS');
 check((await rows(`select * from ${t}`)).length===0,'no backfill');
 for(const privilege of ['SELECT','INSERT','UPDATE','DELETE','TRUNCATE'])check(!(await rows(`select has_table_privilege('anon','${t}','${privilege}') ok`))[0].ok,'anonymous denied');
 check(!(await rows(`select has_table_privilege('authenticated','${t}','TRUNCATE') ok`))[0].ok,'truncate denied');
}
for(const [user,n] of [[a,100],[b,200]]){
 await db.exec(`set role authenticated;set request.jwt.claim.sub='${user}';`);
 for(const [i,t] of tables.entries()){
  const row={id:id(n+i+1),user_id:user,...templates[t](n)};
  const keys=Object.keys(row);await db.query(`insert into ${t}(${keys.join(',')}) values(${keys.map((_,j)=>'$'+(j+1)).join(',')})`,Object.values(row));passed++;
 }
}
await db.exec(`set request.jwt.claim.sub='${a}';`);
for(const [i,t] of tables.entries()){
 check((await rows(`select * from ${t}`)).length===1,'same-org other-owner rows hidden');
 if(t==='saved_prompt_versions'){
  await denied(`update ${t} set name='Overwritten'`);await denied(`delete from ${t}`);
 }else{
  await denied(`update ${t} set user_id='${b}'`);
  if(t==='saved_prompt_runs')await denied(`delete from ${t}`);
  else check((await rows(`delete from ${t} where id='${id(200+i+1)}' returning id`)).length===0,'cross-owner delete hidden');
 }
}
for(const [t,col,value] of [
 ['saved_prompt_runs','prompt_id',id(201)],['smart_table_records','table_id',id(204)],['smart_table_views','table_id',id(204)],
 ['zen_notes','knowledge_document_id',id(22)],['html_studio_documents','source_note_id',id(207)],['seo_snapshots','project_id',id(209)],
 ['task_focus_sessions','task_id',id(32)],['smart_tables','org_id',otherOrg],['zen_notes','org_id',otherOrg],['html_studio_documents','org_id',otherOrg],['seo_projects','org_id',otherOrg]
])await denied(`update ${t} set ${col}='${value}'`);
await denied(`insert into saved_prompt_versions(prompt_id,user_id,version,name,prompt_text) values('${id(201)}','${a}',2,'Foreign','No')`);
await denied(`insert into task_focus_sessions(user_id) values('${a}')`);
await denied(`update task_focus_sessions set task_source=null`);
await denied(`update task_focus_sessions set task_source='agent_tasks',task_id='${id(42)}'`);
await db.exec(`update task_focus_sessions set task_source='agent_tasks',task_id='${id(41)}',ended_at=now(),duration_seconds=1;insert into task_focus_sessions(user_id) values('${a}');`);passed++;
check((await rows('select lifecycle from zen_notes'))[0].lifecycle==='active','original note default');
check((await rows('select status from html_studio_documents'))[0].status==='draft','HTML defaults draft');
await db.exec(`delete from zen_notes where user_id='${a}';`);
check((await rows('select source_note_id from html_studio_documents'))[0].source_note_id===null,'note deletion preserves HTML');
await db.exec(`delete from saved_prompts where user_id='${a}';`);
check((await rows('select * from saved_prompt_versions')).length===0,'parent deletion removes immutable snapshots');
check((await rows('select prompt_id from saved_prompt_runs'))[0].prompt_id===null,'prompt deletion preserves detached history');
await db.exec(`delete from smart_tables where user_id='${a}';delete from seo_projects where user_id='${a}';`);
for(const t of ['smart_table_records','smart_table_views','seo_snapshots'])check((await rows(`select * from ${t}`)).length===0,'parent cascade');
await db.exec('reset role;set role service_role;');
for(const t of tables)check((await rows(`select * from ${t}`)).length>=1,'server access retained');
await db.exec(`reset role;delete from auth.users where id='${a}';`);
for(const t of tables)check((await rows(`select * from ${t}`)).length===1,'owner removal preserves only other owner');
await db.close();console.log(`Content workspace: ${passed} isolated Postgres authorization checks passed.`);
