# Backup, recovery and deployment rollback

Blackstar's database is Supabase Postgres and the app is deployed on Vercel. This note is the operator procedure. It was checked against the repository and against an isolated database. It was not executed against production, and it does not contain connection strings or keys.

## What can be tested without production

The schema changes in this security pass are exercised with PGlite, which never opens a network connection:

```bash
bun run test:agent-economy-apply
```

That command applies `supabase/migrations/20261114210000_agent_economy_idempotent_restore.sql` twice on an empty database, then applies it again after the October 2026 governance recovery, and checks owner, organisation, agent, currency and role isolation.

`bun run build`, `bun run typecheck`, `bun run lint` and `bun run test` check the application. They do not prove that a hosted Supabase backup restores or that a Vercel deployment rolls back. Those two actions need the owner's dashboard.

## Supabase backup

1. Open the production project in the Supabase dashboard and confirm the project ref before doing anything else. Source control currently mentions both `piwhiuangitqvwvwwcga` (issue #966) and `gpvnkxxciuqzirpfsohx` (`supabase/config.toml`). They may be different projects.
2. On a plan with point-in-time recovery, confirm PITR is enabled and note the earliest restorable time before a migration or destructive change. Physical backups on the Pro plan are the fallback when PITR is not available. Confirm the retention window in the dashboard; do not assume a window that the plan does not include.
3. For an extra copy before a reviewed migration, take a logical dump from a trusted operator machine using the dashboard connection string. Keep the dump outside the git repository and outside the browser bundle.

```bash
pg_dump --format=custom --no-owner --file blackstar-prechange.dump "$SUPABASE_DB_URL"
```

`SUPABASE_DB_URL` is a session pooler or direct connection URI from the dashboard. It is a secret. Do not pass it on a shared CI log, do not commit it, and do not echo it. Prefer the dashboard backup when the operator does not already have a local Postgres client.

4. Restore drills belong on a new Supabase branch or a throwaway project, not on the production ref. Restore the custom dump with `pg_restore --no-owner --dbname "$RESTORE_URL" blackstar-prechange.dump`, then run the read-only table check from `docs/security/agent-economy-production-apply-plan.md`. A restore drill is successful when expected tables exist, row level security is on, and row counts match the source snapshot.

## Supabase restore

- Point-in-time recovery replaces the whole database with its state at the chosen time. It undoes every write after that time, including data that arrived after the bad migration. Choose the time from the pre-change backup, not from memory.
- A logical restore into the production database is the wrong tool once production has newer rows. Restore into a new project, verify, then decide whether to cut the application over.
- Rolling back a Vercel deployment does not restore Postgres. An additive migration can stay in place while an older application revision runs, because older code already expects these tables to exist. A migration that future work makes incompatible needs the database restore, not only the Vercel rollback.
- After a restore, check Authentication users and Storage as well as table data. Storage objects are not inside a `pg_dump` of the public schema unless the dump included the storage schema. Use the Supabase backup for a full project restore when storage objects matter.

## Vercel rollback

Production deploys from `main` (`vercel.json` sets `git.deploymentEnabled.main` to true). Feature branches do not auto-deploy. Do not promote a Preview deployment onto Production when Preview and Production use different secrets or worker URLs. The existing budget note in `docs/integrations/2026-10-20-vercel-deployment-budget.md` still applies: a GitHub merge is not proof that Vercel is READY, and HTTP 402 means stop retrying deploys.

To roll back the application:

1. In the Vercel project, open Deployments and find the last Production deployment whose status is READY and whose commit is the known-good revision.
2. Use Instant Rollback / Promote to Production on that deployment. This points the production alias back without a new build and without a git force-push.
3. If the bad revision is already on `main` and must leave the branch, add a new revert commit. Do not rewrite `main`. Lovable tracks this branch, and a force-push drops history there.
4. Confirm the production alias serves the restored deployment id, then smoke-test sign-in. Do not send payments or provider messages as part of the smoke test.

## Order when both are wrong

If a bad deploy included a database migration that the previous application revision cannot read, restore the database to the matching time first, then roll Vercel back to the deployment from that same revision. Doing only the Vercel rollback leaves the new schema under the old code. The agent-economy migration in this change is additive, so an application rollback does not require dropping those tables.

## Secrets during recovery

Service-role keys, Stripe secret keys, webhook secrets and provider keys stay in the Supabase and Vercel secret managers. The tracked `.env.development` file is a placeholder. Publishable Supabase keys and Stripe publishable keys that were committed in older history are public by design, but they still identify an account: rotate them if that account is still in use. Do not rotate them by pasting the new value into git.
