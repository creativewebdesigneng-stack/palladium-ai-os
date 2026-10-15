// Isolated real Postgres authorization and public-projection checks; no provider/network calls.
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
 app_studio_apps:n=>({org_id:org,name:'Fixture app',slug:'fixture-app'}),
 app_studio_pages:n=>({app_id:id(n+1),name:'Home',slug:'home',is_home:true}),
 app_studio_widgets:n=>({app_id:id(n+1),page_id:id(n+2),widget_type:'text',name:'Fixture widget'}),
 app_studio_datasources:n=>({app_id:id(n+1),name:'Fixture source',provider:'rest'}),
 app_studio_queries:n=>({app_id:id(n+1),page_id:id(n+2),datasource_id:id(n+4),name:'Fixture query',operation:'get'}),
 app_studio_releases:n=>({app_id:id(n+1),version:1,snapshot:JSON.stringify({app:{id:id(n+1),name:'Public app',theme:{accent:'#123456'},settings:{private:'settings'},user_id:n===100?a:b,org_id:org},pages:[{id:id(n+2),name:'Home',is_home:true,user_id:n===100?a:b}],widgets:[{id:id(n+3),page_id:id(n+2),widget_type:'text',properties:{text:'Public text'},user_id:n===100?a:b}],datasources:[{connection_ref:'private-connection'}],queries:[{operation:'private-operation'}]})}),
 product_analytics_projects:n=>({org_id:org,name:'Fixture analytics'}),
 product_analytics_events:n=>({project_id:id(n+7),event_name:'Fixture event'}),
 product_analytics_funnels:n=>({project_id:id(n+7),name:'Fixture funnel'}),
 product_analytics_experiments:n=>({project_id:id(n+7),name:'Fixture experiment',goal_event:'Fixture goal'}),
};
const tables=Object.keys(templates);
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
create schema auth;create schema private;create table auth.users(id uuid primary key);create table private.members(user_id uuid,org_id uuid);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function private.is_org_member(_org uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from private.members where user_id=auth.uid() and org_id=_org) $$;
create function set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now();return new;end $$;
grant usage on schema auth,private,public to anon,authenticated,service_role;
grant execute on function auth.uid() to authenticated,anon;grant execute on function private.is_org_member(uuid) to authenticated;
insert into auth.users values('${a}'),('${b}');insert into private.members values('${a}','${org}'),('${b}','${org}');`);
const file=readdirSync('supabase/migrations').find(n=>n.endsWith('_restore_studio_and_analytics.sql'));
const migration=readFileSync('supabase/migrations/'+file,'utf8');await db.exec(migration);
await assert.rejects(()=>db.exec(migration),/requires all ten tables/);passed++;
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
 await denied(`update ${t} set user_id='${b}'`);
 check((await rows(`delete from ${t} where id='${id(200+i+1)}' returning id`)).length===0,'cross-owner delete hidden');
}
for(const [t,col,value] of [
 ['app_studio_apps','org_id',otherOrg],['app_studio_apps','published_release_id',id(206)],
 ['app_studio_pages','app_id',id(201)],['app_studio_widgets','app_id',id(201)],['app_studio_widgets','page_id',id(202)],['app_studio_widgets','parent_id',id(203)],
 ['app_studio_datasources','app_id',id(201)],['app_studio_queries','app_id',id(201)],['app_studio_queries','page_id',id(202)],['app_studio_queries','datasource_id',id(204)],
 ['product_analytics_projects','org_id',otherOrg],['product_analytics_events','project_id',id(207)],['product_analytics_funnels','project_id',id(207)],['product_analytics_experiments','project_id',id(207)]
])await denied(`update ${t} set ${col}='${value}'`);
await denied(`update app_studio_releases set snapshot='{}'`);
await denied(`update app_studio_releases set app_id='${id(201)}'`);
await denied(`update app_studio_widgets set parent_id=id`);
await denied(`insert into app_studio_pages(app_id,user_id,name,slug,is_home) values('${id(101)}','${a}','Second home','second-home',true)`);
await db.exec(`insert into app_studio_apps(id,user_id,name,slug) values('${id(150)}','${a}','Other owned app','other-app');
insert into app_studio_pages(id,app_id,user_id,name,slug) values('${id(151)}','${id(150)}','${a}','Other page','other-page');
insert into app_studio_widgets(id,app_id,page_id,user_id,widget_type,name) values('${id(152)}','${id(150)}','${id(151)}','${a}','container','Other widget');
insert into app_studio_datasources(id,app_id,user_id,name,provider) values('${id(153)}','${id(150)}','${a}','Other source','rest');
insert into app_studio_releases(id,app_id,user_id,version,snapshot) values('${id(154)}','${id(150)}','${a}',1,'{}');`);
for(const [t,col,value] of [
 ['app_studio_widgets','page_id',id(151)],['app_studio_widgets','parent_id',id(152)],['app_studio_queries','page_id',id(151)],['app_studio_queries','datasource_id',id(153)],['app_studio_apps','published_release_id',id(154)]
])await denied(`update ${t} set ${col}='${value}' where id='${id(t==='app_studio_widgets'?103:t==='app_studio_queries'?105:101)}'`);
await db.exec(`insert into app_studio_widgets(id,app_id,page_id,user_id,parent_id,widget_type,name) values('${id(155)}','${id(101)}','${id(102)}','${a}','${id(103)}','text','Child');`);passed++;
check((await rows(`select get_published_app_studio_release('${id(101)}') as doc`))[0].doc===null,'draft app unavailable');
await db.exec(`update app_studio_apps set status='published',published_release_id='${id(106)}' where id='${id(101)}';`);
check((await rows(`select get_published_app_studio_release('${id(101)}') as doc`))[0].doc===null,'unpublished release unavailable');
await db.exec(`update app_studio_releases set status='published',published_at=now() where id='${id(106)}';`);
await db.exec('reset role;set role anon;');
const doc=(await rows(`select get_published_app_studio_release('${id(101)}') as doc`))[0].doc;
check(doc.app.name==='Public app' && doc.widgets[0].properties.text==='Public text','explicit public content available');
check(!('datasources' in doc) && !('queries' in doc),'no datasource or query projection');
check(!('settings' in doc.app) && !('user_id' in doc.app) && !('org_id' in doc.app),'no private app settings or identity');
check(!('user_id' in doc.pages[0]) && !('user_id' in doc.widgets[0]),'no child owner identity');
check(!JSON.stringify(doc).includes('private-connection') && !JSON.stringify(doc).includes('private-operation'),'private snapshot sections absent');
for(const t of tables)await denied(`select * from ${t}`);
await db.exec(`reset role;set role authenticated;set request.jwt.claim.sub='${a}';delete from app_studio_widgets where id='${id(103)}';`);
check((await rows(`select * from app_studio_widgets where id='${id(155)}'`)).length===0,'parent widget cascade');
await db.exec(`delete from app_studio_releases where id='${id(106)}';`);
check((await rows(`select published_release_id from app_studio_apps where id='${id(101)}'`))[0].published_release_id===null,'release deletion clears pointer');
await db.exec('reset role;set role service_role;');
for(const t of tables)check((await rows(`select * from ${t}`)).length>=1,'server access retained');
await db.exec(`reset role;delete from auth.users where id='${a}';`);
for(const t of tables)check((await rows(`select * from ${t}`)).length===1,'owner removal preserves only other owner');
await db.close();console.log(`Studio and analytics: ${passed} isolated Postgres authorization checks passed.`);
