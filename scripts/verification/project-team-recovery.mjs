// Real isolated Postgres authorization fixtures; production is never contacted.
import {readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();let passed=0;
const check=(v,m)=>{assert.ok(v,m);passed++;};
const denied=async q=>{await assert.rejects(()=>db.query(q));passed++;};
const rows=async q=>(await db.query(q)).rows;
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const a=id(1),b=id(2),c=id(3),org=id(11),otherOrg=id(12),pa=id(21),pb=id(22),shared=id(23),otherOwned=id(24);
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
create schema auth;create schema private;create table auth.users(id uuid primary key);
create table organisations(id uuid primary key);create table organisation_members(org_id uuid,user_id uuid,role text);
create table projects(id uuid primary key,user_id uuid,org_id uuid,visibility text default 'private');
create table project_collaborators(project_id uuid,user_id uuid,role text);
create table personal_agents(id uuid primary key,user_id uuid,org_id uuid);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function private.is_org_member(_org uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.organisation_members where user_id=auth.uid() and org_id=_org) $$;
create function private.is_org_admin(_org uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.organisation_members where user_id=auth.uid() and org_id=_org and role in ('owner','admin')) $$;
create function set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now();return new;end $$;
grant usage on schema auth,private,public to anon,authenticated,service_role;
grant select on projects,organisation_members,personal_agents to authenticated;grant update on personal_agents to authenticated;
insert into auth.users values('${a}'),('${b}'),('${c}');insert into organisations values('${org}'),('${otherOrg}');
insert into organisation_members values('${org}','${a}','owner'),('${org}','${b}','member'),('${otherOrg}','${b}','owner');
insert into projects(id,user_id,org_id) values('${pa}','${a}',null),('${pb}','${b}',null),('${shared}','${a}','${org}'),('${otherOwned}','${a}',null);
insert into personal_agents values('${id(31)}','${a}','${org}'),('${id(32)}','${b}','${otherOrg}'),('${id(33)}','${a}',null);`);
// Use the existing repository authorizer verbatim rather than inventing a new permission model.
const repoAuth=readFileSync('supabase/migrations/20260915011500_project_repository_content.sql','utf8');
await db.exec(repoAuth.match(/create or replace function private\.can_write_project\([\s\S]*?\$\$;/)[0]);
const file=readdirSync('supabase/migrations').find(n=>n.endsWith('_restore_project_team_contracts.sql'));
const migration=readFileSync('supabase/migrations/'+file,'utf8');await db.exec(migration);
await assert.rejects(()=>db.exec(migration),/requires all five tables/);passed++;
const tables=['project_cycles','project_modules','project_work_items','teams','team_members'];
for(const t of tables){
 check((await rows(`select relrowsecurity from pg_class where oid='${t}'::regclass`))[0].relrowsecurity,'RLS');
 check((await rows(`select * from ${t}`)).length===0,'no backfill');
 for(const privilege of ['SELECT','INSERT','UPDATE','DELETE','TRUNCATE'])check(!(await rows(`select has_table_privilege('anon','${t}','${privilege}') ok`))[0].ok,'anonymous denied');
 check(!(await rows(`select has_table_privilege('authenticated','${t}','TRUNCATE') ok`))[0].ok,'truncate denied');
}
for(const [user,n,project] of [[a,100,pa],[b,200,pb],[a,300,shared],[a,400,otherOwned]]){
 await db.exec(`set role authenticated;set request.jwt.claim.sub='${user}';
 insert into project_cycles(id,project_id,created_by,name) values('${id(n+1)}','${project}','${user}','Fixture cycle');
 insert into project_modules(id,project_id,created_by,name) values('${id(n+2)}','${project}','${user}','Fixture module');
 insert into project_work_items(id,project_id,created_by,title,cycle_id,module_id) values('${id(n+3)}','${project}','${user}','Fixture work','${id(n+1)}','${id(n+2)}');`);passed+=3;
}
await db.exec(`set request.jwt.claim.sub='${a}';insert into teams(id,org_id,name,created_by,lead_agent_id) values('${id(501)}','${org}','Fixture team','${a}','${id(31)}');
insert into team_members(id,team_id,user_id) values('${id(502)}','${id(501)}','${b}');`);passed+=2;
await denied(`insert into team_members(team_id,user_id) values('${id(501)}','${c}')`);
await denied(`update teams set lead_agent_id='${id(32)}'`);
await denied(`update teams set org_id='${otherOrg}'`);
await db.exec(`update personal_agents set team_id='${id(501)}' where id='${id(31)}';`);passed++;
await denied(`update personal_agents set team_id='${id(501)}' where id='${id(32)}'`);
await denied(`update personal_agents set team_id='${id(501)}' where id='${id(33)}'`);
for(const t of tables.slice(0,3)){
 check((await rows(`select * from ${t} where project_id='${pb}'`)).length===0,'other personal project hidden');
 check((await rows(`delete from ${t} where project_id='${pb}' returning id`)).length===0,'other personal project deletion denied');
 await denied(`update ${t} set created_by='${b}'`);
 await denied(`update ${t} set project_id='${pb}'`);
}
for(const [col,value] of [['cycle_id',id(201)],['module_id',id(202)],['parent_id',id(203)],['cycle_id',id(401)],['module_id',id(402)],['parent_id',id(403)]])await denied(`update project_work_items set ${col}='${value}' where id='${id(103)}'`);
await denied(`update project_work_items set parent_id=id where id='${id(103)}'`);
await db.exec(`insert into project_work_items(id,project_id,created_by,title,parent_id) values('${id(150)}','${pa}','${a}','Child','${id(103)}');delete from project_cycles where id='${id(101)}';delete from project_modules where id='${id(102)}';`);
const item=(await rows(`select project_id,cycle_id,module_id from project_work_items where id='${id(103)}'`))[0];
check(item.project_id===pa && item.cycle_id===null && item.module_id===null,'parent deletion preserves work project');
await db.exec(`delete from project_work_items where id='${id(103)}';`);
check((await rows(`select parent_id from project_work_items where id='${id(150)}'`))[0].parent_id===null,'parent item deletion preserves child');
await db.exec(`set request.jwt.claim.sub='${b}';`);
for(const t of ['teams','team_members']){
 check((await rows(`select * from ${t}`)).length===1,'organisation member can read teams');
 check((await rows(`delete from ${t} returning id`)).length===0,'ordinary member cannot delete teams');
}
await denied(`insert into teams(org_id,name) values('${org}','Unauthorised')`);
await denied(`insert into team_members(team_id,user_id) values('${id(501)}','${a}')`);
for(const t of tables.slice(0,3)){
 check((await rows(`select * from ${t} where project_id='${shared}'`)).length===1,'member can read existing organisation work');
 check((await rows(`delete from ${t} where project_id='${shared}' returning id`)).length===0,'member without project write role cannot delete');
}
await denied(`insert into project_cycles(project_id,created_by,name) values('${shared}','${b}','Unprivileged cycle')`);
await db.exec(`reset role;insert into project_collaborators values('${shared}','${b}','contributor');set role authenticated;set request.jwt.claim.sub='${b}';update project_work_items set status='in_progress' where project_id='${shared}';`);
check((await rows(`select status from project_work_items where project_id='${shared}'`))[0].status==='in_progress','explicit current project writer can update');
await db.exec(`set request.jwt.claim.sub='${c}';`);
for(const t of tables)check((await rows(`select * from ${t}`)).length===0,'outsider hidden');
await db.exec(`reset role;set role authenticated;set request.jwt.claim.sub='${a}';delete from teams where id='${id(501)}';`);
check((await rows(`select team_id,org_id from personal_agents where id='${id(31)}'`))[0].team_id===null,'team deletion detaches agent');
check((await rows(`select org_id from personal_agents where id='${id(31)}'`))[0].org_id===org,'team deletion preserves agent organisation');
check((await rows('select * from team_members')).length===0,'team member cascade');
await db.exec(`reset role;delete from projects where id='${pa}';`);
for(const t of tables.slice(0,3))check((await rows(`select * from ${t} where project_id='${pa}'`)).length===0,'project retention cascade');
await db.close();console.log(`Project/team recovery: ${passed} isolated Postgres authorization checks passed.`);
