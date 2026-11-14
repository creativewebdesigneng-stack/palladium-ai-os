// Isolated PGlite checks for the issue #966 restore. Never contacts production.
import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";

const migrationText = (suffix) => {
  const name = readdirSync("supabase/migrations").find((entry) => entry.endsWith(suffix));
  if (!name) throw new Error(`Missing migration ${suffix}`);
  return readFileSync(`supabase/migrations/${name}`, "utf8");
};

const economyMigration = migrationText("_agent_economy_idempotent_restore.sql");
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const ownerA = id(1);
const ownerB = id(2);
const orgA = id(11);
const orgB = id(12);
const agentA = id(21);
const agentA2 = id(22);
const agentB = id(23);

async function newDatabase() {
  const db = new PGlite();
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create schema private;
    create table auth.users(id uuid primary key);
    create table organisations(id uuid primary key);
    create table organisation_members(org_id uuid, user_id uuid, role text);
    create table personal_agents(id uuid primary key, user_id uuid, org_id uuid, org_id_fk uuid);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    create function private.is_org_member(_org uuid) returns boolean
      language sql stable security definer set search_path = '' as $$
      select exists(
        select 1 from public.organisation_members
        where user_id = auth.uid() and org_id = _org
      )
    $$;
    create function private.is_org_admin(_org uuid) returns boolean
      language sql stable security definer set search_path = '' as $$
      select exists(
        select 1 from public.organisation_members
        where user_id = auth.uid() and org_id = _org and role in ('owner', 'admin')
      )
    $$;
    grant usage on schema auth, private, public to anon, authenticated, service_role;
    grant select on personal_agents to authenticated;
    grant all on personal_agents to service_role;
    insert into auth.users values ('${ownerA}'), ('${ownerB}');
    insert into organisations values ('${orgA}'), ('${orgB}');
    insert into organisation_members values
      ('${orgA}', '${ownerA}', 'owner'),
      ('${orgA}', '${ownerB}', 'member'),
      ('${orgB}', '${ownerB}', 'owner');
    insert into personal_agents values
      ('${agentA}', '${ownerA}', '${orgA}', '${orgA}'),
      ('${agentA2}', '${ownerA}', '${orgA}', '${orgA}'),
      ('${agentB}', '${ownerB}', '${orgB}', '${orgB}');
  `);
  return db;
}

async function assertIsolated(db) {
  let passed = 0;
  const check = (value, message) => {
    assert.ok(value, message);
    passed += 1;
  };
  const rows = async (query, params) => (await db.query(query, params)).rows;
  const denied = async (query) => {
    await assert.rejects(() => db.query(query));
    passed += 1;
  };

  const tables = [
    "agent_economy_accounts",
    "agent_economy_entries",
    "agent_simulation_runs",
    "agent_evolution_proposals",
  ];
  for (const table of tables) {
    check(
      (await rows(`select relrowsecurity from pg_class where oid='public.${table}'::regclass`))[0]
        .relrowsecurity,
      `${table} RLS`,
    );
    check(
      (await rows(`select count(*)::int as n from ${table}`))[0].n === 0,
      `${table} starts empty`,
    );
    for (const privilege of ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE"]) {
      check(
        !(await rows(`select has_table_privilege('anon','${table}','${privilege}') as ok`))[0].ok,
        `anon ${privilege} denied on ${table}`,
      );
    }
  }
  check(
    !(
      await rows(
        `select has_table_privilege('authenticated','agent_economy_accounts','INSERT') as ok`,
      )
    )[0].ok,
    "ledger accounts are not client-writable",
  );
  check(
    !(
      await rows(
        `select has_table_privilege('authenticated','agent_economy_entries','INSERT') as ok`,
      )
    )[0].ok,
    "ledger entries are not client-writable",
  );
  check(
    (
      await rows(
        `select has_table_privilege('authenticated','agent_simulation_runs','INSERT') as ok`,
      )
    )[0].ok,
    "simulation append is allowed",
  );
  check(
    !(
      await rows(
        `select has_table_privilege('authenticated','agent_simulation_runs','UPDATE') as ok`,
      )
    )[0].ok,
    "simulation is append-only",
  );
  check(
    !(
      await rows(
        `select has_table_privilege('authenticated','agent_evolution_proposals','UPDATE') as ok`,
      )
    )[0].ok,
    "evolution is append-only",
  );

  const accountA = id(101);
  const entryA = id(102);
  const accountB = id(201);
  const entryB = id(202);
  await db.exec(`reset role; set role service_role;`);
  await db.query(
    `insert into agent_economy_accounts(id,user_id,org_id,agent_id,currency) values ($1,$2,$3,$4,'GBP')`,
    [accountA, ownerA, orgA, agentA],
  );
  await db.query(
    `insert into agent_economy_entries(id,user_id,org_id,account_id,agent_id,kind,amount_micros,currency,reference)
     values ($1,$2,$3,$4,$5,'credit',100,'GBP','Isolated fixture')`,
    [entryA, ownerA, orgA, accountA, agentA],
  );
  await db.query(
    `insert into agent_economy_accounts(id,user_id,org_id,agent_id,currency) values ($1,$2,$3,$4,'GBP')`,
    [accountB, ownerB, orgB, agentB],
  );
  await db.query(
    `insert into agent_economy_entries(id,user_id,org_id,account_id,agent_id,kind,amount_micros,currency,reference)
     values ($1,$2,$3,$4,$5,'credit',50,'GBP','Other owner fixture')`,
    [entryB, ownerB, orgB, accountB, agentB],
  );
  passed += 4;

  await denied(
    `insert into agent_economy_accounts(user_id,org_id,agent_id) values ('${ownerA}','${orgA}','${agentB}')`,
  );
  await denied(
    `insert into agent_economy_accounts(user_id,org_id,agent_id) values ('${ownerA}','${orgB}','${agentA}')`,
  );
  await denied(`update agent_economy_entries set currency='USD' where id='${entryA}'`);
  await denied(`update agent_economy_entries set user_id='${ownerB}' where id='${entryA}'`);
  await denied(`update agent_economy_entries set agent_id='${agentB}' where id='${entryA}'`);
  await denied(`update agent_economy_entries set org_id='${orgB}' where id='${entryA}'`);
  await denied(
    `insert into agent_economy_entries(user_id,org_id,account_id,agent_id,kind,amount_micros,currency,reference)
     values ('${ownerB}','${orgB}','${accountA}','${agentA}','credit',1,'GBP','Cross account')`,
  );

  await db.exec(`reset role; set role authenticated; set request.jwt.claim.sub='${ownerA}';`);
  check(
    (await rows("select id from agent_economy_accounts")).length === 1,
    "owner A sees one account",
  );
  check(
    (await rows("select id from agent_economy_entries")).length === 1,
    "owner A sees one entry",
  );
  await denied(
    `insert into agent_economy_accounts(user_id,agent_id) values ('${ownerA}','${agentA2}')`,
  );
  await denied(
    `insert into agent_economy_entries(user_id,account_id,agent_id,kind,amount_micros,currency,reference)
     values ('${ownerA}','${accountA}','${agentA}','credit',999999,'GBP','Forged credit')`,
  );
  await denied(`delete from agent_economy_entries where id='${entryA}'`);

  await db.query(
    `insert into agent_simulation_runs(user_id,org_id,agent_id,scenario,result,status,projected_cost_micros,risk_score)
     values ($1,$2,$3,'{}','{}','needs_approval',1,1)`,
    [ownerA, orgA, agentA],
  );
  passed += 1;
  await denied(
    `insert into agent_simulation_runs(user_id,org_id,agent_id,scenario,result,status,projected_cost_micros,risk_score)
     values ('${ownerA}','${orgB}','${agentA}','{}','{}','pass',0,0)`,
  );
  await denied(
    `insert into agent_simulation_runs(user_id,org_id,agent_id,scenario,result,status,projected_cost_micros,risk_score)
     values ('${ownerA}','${orgA}','${agentB}','{}','{}','pass',0,0)`,
  );
  await db.exec(`set request.jwt.claim.sub='${ownerB}';`);
  await denied(
    `insert into agent_simulation_runs(user_id,org_id,agent_id,scenario,result,status,projected_cost_micros,risk_score)
     values ('${ownerB}','${orgA}','${agentA}','{}','{}','pass',0,0)`,
  );
  check(
    (await rows("select id from agent_simulation_runs")).length === 0,
    "owner B cannot read owner A simulation",
  );

  await db.exec(`set request.jwt.claim.sub='${ownerA}';`);
  await db.query(
    `insert into agent_evolution_proposals(user_id,org_id,agent_id,change_type,change_summary,baseline_metrics,candidate_metrics,decision_status,decision_score)
     values ($1,$2,$3,'prompt','Fixture proposal','{}','{}','review',0)`,
    [ownerA, orgA, agentA],
  );
  passed += 1;
  const proposal = (
    await rows("select requires_approval, applied from agent_evolution_proposals")
  )[0];
  check(
    proposal.requires_approval === true && proposal.applied === false,
    "evolution cannot apply itself",
  );
  await denied(
    `insert into agent_evolution_proposals(user_id,org_id,agent_id,change_type,change_summary,baseline_metrics,candidate_metrics,decision_status,decision_score,applied,requires_approval)
     values ('${ownerA}','${orgA}','${agentA}','prompt','No direct execution','{}','{}','promote',1,true,false)`,
  );
  await denied(
    `insert into agent_evolution_proposals(user_id,org_id,agent_id,change_type,change_summary,baseline_metrics,candidate_metrics,decision_status,decision_score)
     values ('${ownerA}','${orgB}','${agentA}','prompt','Wrong organisation','{}','{}','review',0)`,
  );
  await denied(`update agent_evolution_proposals set applied=true`);
  await denied(`delete from agent_simulation_runs`);

  await db.exec("reset role; set role anon;");
  for (const table of tables) await denied(`select * from ${table}`);

  return passed;
}

const fresh = await newDatabase();
await fresh.exec(economyMigration);
await fresh.exec(economyMigration);
const freshPassed = await assertIsolated(fresh);
await fresh.exec("reset role;");
const retained = await fresh.query("select count(*)::int as n from agent_economy_entries");
assert.equal(retained.rows[0].n, 2);
await fresh.exec(economyMigration);
const stillThere = await fresh.query("select count(*)::int as n from agent_economy_entries");
assert.equal(stillThere.rows[0].n, 2);
await fresh.close();

const recovered = await newDatabase();
await recovered.exec(migrationText("_restore_agent_governance.sql"));
await recovered.exec(migrationText("_cover_agent_economy_account_identity.sql"));
await recovered.exec(migrationText("_enforce_agent_economy_owner_identity.sql"));
await recovered.exec(economyMigration);
const recoveredPassed = await assertIsolated(recovered);
await recovered.close();

console.log(
  `Agent economy idempotent restore: ${freshPassed} fresh checks and ${recoveredPassed} post-recovery checks passed.`,
);
