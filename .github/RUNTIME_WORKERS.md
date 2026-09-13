# Runtime workers

Production queue draining is owned by Supabase `pg_cron` + `pg_net`, not GitHub Actions.

Two five-minute jobs call the protected internal endpoints:

- `/api/internal/workflow-runs?limit=4`
- `/api/internal/webhook-retries?limit=50`

The workflow-runs endpoint is the single protected drain for durable workflows, personal reminders, resumable agent runs, autonomous goals, and Legal Hub automation. Legal Hub regulatory monitoring therefore reuses the existing scheduler instead of adding a second cron owner. Compliance review-date and rights/obligations date signals are also processed there and are review reminders only, not legal conclusions.

The scheduler is provisioned by `supabase/migrations/20260913024500_runtime_worker_scheduler.sql`. Its bearer tokens are generated inside Postgres, stored plaintext only in Supabase Vault, and represented outside Vault only by SHA-256 hashes in the server-only `runtime_worker_credentials` table. The application accepts the matching database hash through `runtime-worker-auth.server.ts`; a plaintext token does not need to be copied into source control or a browser-visible environment.

GitHub Actions is intentionally not used as a second scheduler to avoid duplicate queue drains and split operational ownership.

After scheduler provisioning or recovery, verify all of the following before calling production healthy:

- `pg_cron` and `pg_net` are installed.
- `cron.job` contains exactly one enabled `blackstar-workflow-runner` and one enabled `blackstar-webhook-retries` job on the five-minute cadence.
- `runtime_worker_credentials` has RLS enabled and no `anon` or `authenticated` grants.
- Vault contains the two named worker secrets without exposing their values.
- `cron.job_run_details` shows successful scheduler invocations.
- `net._http_response` shows HTTP 200 from both protected endpoints after the current `main` deployment is live.

If the scheduler is changed in future, keep exactly one authoritative production scheduler and verify both endpoints return HTTP 200 before considering the worker system healthy.
