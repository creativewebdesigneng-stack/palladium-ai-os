// Isolated Postgres fixtures only; never calls providers or publishes content.
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
 social_posts:n=>({content:'Fixture draft',org_id:org,created_by_agent_id:id(n===100?21:22)}),
 social_post_targets:n=>({post_id:id(n+1),provider:'fixture',action:'fixture.publish',approval_request_id:id(n===100?31:32)}),
 notification_endpoints:n=>({label:'Fixture endpoint',topic:'fixture-topic'}),
 web_crawl_jobs:n=>({provider:'crawlee',operation:'scrape',source:'https://example.test'}),
 voice_clone_jobs:n=>({text:'Fixture text',reference_filename:'fixture.wav',reference_mime_type:'audio/wav'}),
 user_documents:n=>({title:'Fixture document'}),
};
const tables=Object.keys(templates);
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
create schema auth;create schema private;create table auth.users(id uuid primary key);create table private.members(user_id uuid,org_id uuid);
create table personal_agents(id uuid primary key,user_id uuid);create table approval_requests(id uuid primary key,user_id uuid);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function private.is_org_member(_org uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from private.members where user_id=auth.uid() and org_id=_org) $$;
create function set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now();return new;end $$;
grant usage on schema auth,private,public to anon,authenticated,service_role;
grant execute on function auth.uid() to authenticated,anon;grant execute on function private.is_org_member(uuid) to authenticated;
grant select on personal_agents,approval_requests to authenticated;
insert into auth.users values('${a}'),('${b}');insert into private.members values('${a}','${org}'),('${b}','${org}');
insert into personal_agents values('${id(21)}','${a}'),('${id(22)}','${b}');insert into approval_requests values('${id(31)}','${a}'),('${id(32)}','${b}');`);
const file=readdirSync('supabase/migrations').find(n=>n.endsWith('_restore_private_operations.sql'));
const migration=readFileSync('supabase/migrations/'+file,'utf8');await db.exec(migration);
await assert.rejects(()=>db.exec(migration),/requires all six tables absent/);passed++;
for(const t of tables){
 check((await rows(`select relrowsecurity from pg_class where oid='${t}'::regclass`))[0].relrowsecurity,'RLS');
 check((await rows(`select * from ${t}`)).length===0,'no backfill');
 for(const privilege of ['SELECT','INSERT','UPDATE','DELETE','TRUNCATE'])check(!(await rows(`select has_table_privilege('anon','${t}','${privilege}') ok`))[0].ok,'anonymous denied');
 check(!(await rows(`select has_table_privilege('authenticated','${t}','TRUNCATE') ok`))[0].ok,'truncate denied');
}
for(const [user,n] of [[a,100],[b,200]]){
 await db.exec(`set role authenticated;set request.jwt.claim.sub='${user}';`);
 for(const [i,t] of tables.entries()){
  const row={id:id(n+i+1),user_id:user,...templates[t](n)};const keys=Object.keys(row);
  await db.query(`insert into ${t}(${keys.join(',')}) values(${keys.map((_,j)=>'$'+(j+1)).join(',')})`,Object.values(row));passed++;
 }
}
await db.exec(`set request.jwt.claim.sub='${a}';`);
for(const [i,t] of tables.entries()){
 check((await rows(`select * from ${t}`)).length===1,'same-org other-owner hidden');
 await denied(`update ${t} set user_id='${b}'`);
 check((await rows(`delete from ${t} where id='${id(200+i+1)}' returning id`)).length===0,'other-owner deletion hidden');
}
for(const [t,col,value] of [['social_posts','org_id',otherOrg],['social_posts','created_by_agent_id',id(22)],['social_post_targets','post_id',id(201)],['social_post_targets','approval_request_id',id(32)],['user_documents','origin_document_id',id(206)]])await denied(`update ${t} set ${col}='${value}'`);
await denied(`insert into user_documents(user_id,title,origin_document_id) values('${a}','Foreign parent','${id(206)}')`);
await denied('update user_documents set origin_document_id=id');
await db.exec(`insert into user_documents(id,user_id,title,origin_document_id) values('${id(150)}','${a}','Derived','${id(106)}');delete from user_documents where id='${id(106)}';`);
const derived=(await rows(`select user_id,origin_document_id from user_documents`))[0];
check(derived.user_id===a && derived.origin_document_id===null,'origin deletion preserves derived document owner');
check((await rows('select status from social_posts'))[0].status==='draft','social default draft');
check((await rows('select status from social_post_targets'))[0].status==='pending','target default pending');
check((await rows('select status from voice_clone_jobs'))[0].status==='queued','voice history not fabricated');
check((await rows('select status from web_crawl_jobs'))[0].status==='queued','crawl history not fabricated');
await db.exec(`delete from social_posts where user_id='${a}';`);
check((await rows('select * from social_post_targets')).length===0,'post deletion cascades owned targets');
await db.exec('reset role;set role service_role;');
for(const t of tables)check((await rows(`select * from ${t}`)).length>=1,'server access retained');
await db.exec(`reset role;delete from auth.users where id='${a}';`);
for(const t of tables)check((await rows(`select * from ${t}`)).length===1,'owner removal preserves other owner');
await db.close();console.log(`Private operations: ${passed} isolated Postgres authorization checks passed.`);
