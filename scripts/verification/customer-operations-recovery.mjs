// Isolated Postgres fixtures only; no messages, broadcasts or production writes.
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite(); let passed = 0;
const check = (v, message) => { assert.ok(v, message); passed++; };
const denied = async query => { await assert.rejects(() => db.query(query)); passed++; };
const rows = async query => (await db.query(query)).rows;
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const a = id(1), b = id(2), org = id(11), otherOrg = id(12);
const templates = {
  crm_contacts: n => ({ name:'Fixture',org_id:org }),
  crm_activities: n => ({ contact_id:id(n+1),summary:'Fixture note' }),
  crm_field_definitions: n => ({ key:'fixture',label:'Fixture',field_type:'text' }),
  crm_saved_views: n => ({ name:'Fixture' }),
  support_inboxes: n => ({ name:'Fixture',channel:'web' }),
  support_tickets: n => ({ subject:'Fixture',org_id:org,inbox_id:id(n+5),crm_contact_id:id(n+1) }),
  support_messages: n => ({ ticket_id:id(n+6),body:'Fixture internal note' }),
  support_canned_responses: n => ({ name:'Fixture',shortcut:'fixture',content:'Fixture' }),
  support_help_articles: n => ({ title:'Fixture',slug:'fixture' }),
  whatsapp_conversations: n => ({ contact_id:id(n+1),assigned_agent_id:id(n===100?21:22) }),
  whatsapp_messages: n => ({ conversation_id:id(n+10),direction:'outbound',text_content:'Fixture draft' }),
  whatsapp_broadcasts: n => ({ name:'Fixture draft' }),
  whatsapp_broadcast_recipients: n => ({ broadcast_id:id(n+12),contact_id:id(n+1) }),
};
const tables = Object.keys(templates), immutable = ['crm_activities','support_messages'];
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
create schema auth;create schema private;
create table auth.users(id uuid primary key);create table organisations(id uuid primary key);
create table personal_agents(id uuid primary key,user_id uuid);
create table private.members(user_id uuid,org_id uuid);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function private.is_org_member(_org uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from private.members where user_id=auth.uid() and org_id=_org) $$;
create function set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now();return new;end $$;
grant usage on schema auth,private,public to anon,authenticated,service_role;
grant execute on function auth.uid() to authenticated,anon;
grant execute on function private.is_org_member(uuid) to authenticated;
grant select on personal_agents to authenticated;
insert into auth.users values('${a}'),('${b}');insert into organisations values('${org}'),('${otherOrg}');
insert into private.members values('${a}','${org}'),('${b}','${org}');
insert into personal_agents values('${id(21)}','${a}'),('${id(22)}','${b}');`);
const file = readdirSync('supabase/migrations').find(n => n.endsWith('_restore_customer_operations_schema.sql'));
const migration = readFileSync('supabase/migrations/'+file,'utf8');
await db.exec(migration);
await assert.rejects(() => db.exec(migration), /requires all thirteen tables absent/); passed++;
for (const table of tables) {
  check((await rows(`select relrowsecurity from pg_class where oid='${table}'::regclass`))[0].relrowsecurity,'RLS');
  check((await rows(`select * from ${table}`)).length===0,'no backfill');
  for (const privilege of ['SELECT','INSERT','UPDATE','DELETE','TRUNCATE']) check(!(await rows(`select has_table_privilege('anon','${table}','${privilege}') ok`))[0].ok,'anonymous denied');
  check(!(await rows(`select has_table_privilege('authenticated','${table}','TRUNCATE') ok`))[0].ok,'truncate denied');
}
for (const [user,n] of [[a,100],[b,200]]) {
  await db.exec(`set role authenticated;set request.jwt.claim.sub='${user}';`);
  for (const [i,table] of tables.entries()) {
    const row = { id:id(n+i+1),user_id:user,...templates[table](n) };
    const keys = Object.keys(row);
    await db.query(`insert into ${table}(${keys.join(',')}) values(${keys.map((_,j)=>'$'+(j+1)).join(',')})`,Object.values(row));
    passed++;
  }
}
await db.exec(`set request.jwt.claim.sub='${a}';`);
for (const [i,table] of tables.entries()) {
  const visible = await rows(`select user_id from ${table}`);
  check(visible.length===1 && visible[0].user_id===a,'same-org cross-owner reads hidden');
  check((await rows(`delete from ${table} where id='${id(200+i+1)}' returning id`)).length===0,'cross-owner deletion hidden');
  if (!immutable.includes(table)) {
    check((await rows(`update ${table} set user_id='${a}' where id='${id(200+i+1)}' returning id`)).length===0,'cross-owner update hidden');
    await denied(`update ${table} set user_id='${b}' where user_id='${a}'`);
  } else await denied(`update ${table} set user_id='${b}'`);
}
await denied(`update crm_contacts set org_id='${otherOrg}'`);
await denied(`update support_tickets set org_id='${otherOrg}'`);
await denied(`insert into crm_activities(user_id,contact_id,summary) values('${a}','${id(201)}','denied')`);
await denied(`insert into support_messages(user_id,ticket_id,body) values('${a}','${id(206)}','denied')`);
await denied(`update support_tickets set inbox_id='${id(205)}' where user_id='${a}'`);
await denied(`update support_tickets set crm_contact_id='${id(201)}' where user_id='${a}'`);
await denied(`update whatsapp_conversations set contact_id='${id(201)}' where user_id='${a}'`);
await denied(`update whatsapp_conversations set assigned_agent_id='${id(22)}' where user_id='${a}'`);
await denied(`update whatsapp_messages set conversation_id='${id(210)}' where user_id='${a}'`);
await denied(`update whatsapp_messages set reply_to_message_id='${id(211)}' where user_id='${a}'`);
await denied(`update whatsapp_broadcast_recipients set broadcast_id='${id(212)}' where user_id='${a}'`);
await denied(`update whatsapp_broadcast_recipients set contact_id='${id(201)}' where user_id='${a}'`);
await db.exec(`insert into whatsapp_conversations(id,user_id,contact_id,provider) values('${id(199)}','${a}','${id(101)}','fixture-secondary');`);
await denied(`insert into whatsapp_messages(user_id,conversation_id,direction,reply_to_message_id) values('${a}','${id(199)}','outbound','${id(111)}')`);
await db.exec(`insert into whatsapp_messages(id,user_id,conversation_id,direction,reply_to_message_id) values('${id(114)}','${a}','${id(110)}','outbound','${id(111)}');`); passed++;
await denied(`update whatsapp_messages set conversation_id='${id(199)}' where id='${id(111)}'`);
check((await rows(`delete from whatsapp_messages where id='${id(111)}' returning id`)).length===1,'owner deletion allowed');
const reply = (await rows(`select user_id,conversation_id,reply_to_message_id from whatsapp_messages where id='${id(114)}'`))[0];
check(reply.user_id===a && reply.conversation_id===id(110) && reply.reply_to_message_id===null,'deletion clears only reply link');
check((await rows(`select status from whatsapp_broadcasts where user_id='${a}'`))[0].status==='draft','broadcast not sent');
check((await rows(`select status from whatsapp_messages where user_id='${a}'`))[0].status==='queued','message not marked delivered');
await db.exec('reset role;set role service_role;');
for (const table of tables) check((await rows(`select * from ${table}`)).length>=2,'server scope retained');
await db.exec(`reset role;delete from auth.users where id='${a}';`);
for (const table of tables) {
  check((await rows(`select * from ${table} where user_id='${a}'`)).length===0,'owner deletion removes personal records');
  check((await rows(`select * from ${table} where user_id='${b}'`)).length===1,'owner deletion preserves another owner');
}
await db.close();console.log(`Customer operations: ${passed} isolated Postgres authorization checks passed.`);
