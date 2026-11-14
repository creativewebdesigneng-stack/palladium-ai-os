# Agent economy production apply plan

Issue #966. This plan is for a human operator. Nothing in this change applies the migration to production, and no production credential is stored in the repository.

## What is already in source

`20260904113000_blackstar_agent_economy.sql`, `20260904123000_blackstar_simulation.sql` and `20260904133500_blackstar_evolution.sql` create the four tables, but the simulation and evolution insert policies only check `user_id = auth.uid()`. They do not prove agent ownership or organisation membership.

`20261016101516_restore_agent_governance.sql` creates a stricter six-table recovery, then refuses to run again if any of those tables exist. Issue #966 recorded that `20260904113000` was absent from production migration history on project `piwhiuangitqvwvwwcga`. A later note said the October recovery had been applied there. `supabase/config.toml` names a different project id, `gpvnkxxciuqzirpfsohx`. Treat both as unverified until a read-only check says which database is production and whether the four tables are present.

## Migration to apply

Apply only the new file:

`supabase/migrations/20261114210000_agent_economy_idempotent_restore.sql`

It is additive and idempotent:

- Creates `agent_economy_accounts`, `agent_economy_entries`, `agent_simulation_runs` and `agent_evolution_proposals` when they are absent.
- Refuses to continue if one of those tables exists without the columns the handlers expect. Review that partial shape before retrying. Do not drop the table to force the migration through.
- Adds the account identity unique key and the ledger foreign key on `(account_id, user_id, agent_id, currency)` when those constraints are absent.
- Replaces the weak simulation and evolution insert policies. Authenticated inserts must match the caller, an organisation they belong to, and an agent they own in that same organisation. Evolution rows must keep `requires_approval = true` and `applied = false`.
- Leaves ledger writes to `service_role`. Triggers require the account to match an owned `personal_agents` row and the ledger organisation to match the account.
- Does not insert rows, move money, call a provider, or apply an evolution proposal.

Do not replay `20261016101516` on a database where any of its six tables already exist. Supabase will skip migrations it has already recorded.

## Before applying

1. Confirm the target project in the Supabase dashboard. Do not guess from the two ids above.
2. Take a fresh backup or confirm point-in-time recovery is on, using the backup procedure in `docs/security/backup-recovery-and-deployment-rollback.md`.
3. Run this read-only check in the SQL editor. It changes nothing.

```sql
select c.relname,
       c.relrowsecurity as rls_enabled,
       (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'agent_economy_accounts',
    'agent_economy_entries',
    'agent_simulation_runs',
    'agent_evolution_proposals'
  )
order by c.relname;

select version from supabase_migrations.schema_migrations
where version in ('20260904113000', '20261016101516', '20261114210000')
order by version;
```

4. Apply the migration on a Supabase preview branch or a local database restored from a backup first. The isolated check `bun run test:agent-economy-apply` already covers an empty database and a database that already has the October recovery. It does not replace a preview apply against a copy of production.

## Apply

Use the project's normal migration path (`supabase db push` against the confirmed project, or the dashboard SQL editor with the file contents). Apply this one migration. Do not run a financial backfill afterwards. Do not call settlement, provider, or evolution-apply code as part of the schema change.

## After applying

```sql
select relname, relrowsecurity
from pg_class
join pg_namespace n on n.oid = relnamespace
where n.nspname = 'public'
  and relname in (
    'agent_economy_accounts',
    'agent_economy_entries',
    'agent_simulation_runs',
    'agent_evolution_proposals'
  );

select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name like 'agent_%'
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

select count(*) as accounts from public.agent_economy_accounts;
select count(*) as entries from public.agent_economy_entries;
select count(*) as simulations from public.agent_simulation_runs;
select count(*) as proposals from public.agent_evolution_proposals;
```

Expect row level security on all four tables, no `anon` privileges, `authenticated` `SELECT` only on the ledger tables, `SELECT` and `INSERT` only on simulation and evolution, and zero rows unless the tables already held data before this migration. This migration does not delete existing rows.

Then run an authenticated UI smoke test of balance, simulation history and evolution proposals with two different users. Confirm user A cannot read user B. Do not move money.

## Rollback

Prefer restoring the backup or point-in-time recovery taken in the pre-check. Restoring the database does not roll back the Vercel deployment; roll those back separately.

There is no down migration in this repository. Do not drop the tables if they contain rows, or if the October recovery created them and later product data landed. The only manual drop that is safe is a mistaken first apply that the post-check still shows as four empty tables, and only after the backup exists:

```sql
-- Operator-only. Refuse unless every table is still empty.
do $$
declare accounts bigint; entries bigint; simulations bigint; proposals bigint;
begin
  select count(*) into accounts from public.agent_economy_accounts;
  select count(*) into entries from public.agent_economy_entries;
  select count(*) into simulations from public.agent_simulation_runs;
  select count(*) into proposals from public.agent_evolution_proposals;
  if accounts + entries + simulations + proposals > 0 then
    raise exception 'refusing to drop agent economy tables that contain rows';
  end if;
end $$;
drop table if exists public.agent_economy_entries;
drop table if exists public.agent_economy_accounts;
drop table if exists public.agent_simulation_runs;
drop table if exists public.agent_evolution_proposals;
```

Dropping the ledger before the accounts matters because of the foreign key. After a drop, remove the `20261114210000` row from `supabase_migrations.schema_migrations` only if you intend to apply the migration again. Leaving the schema migration row in place while the tables are gone is how this gap reappears.
