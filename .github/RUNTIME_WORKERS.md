# Runtime workers

Production queue draining is owned by Supabase `pg_cron` + `pg_net`, not GitHub Actions.

Two five-minute jobs call the protected internal endpoints:

- `/api/internal/workflow-runs?limit=4`
- `/api/internal/webhook-retries?limit=50`

Bearer tokens are loaded from Supabase Vault and verified by the server-only runtime worker credential path. GitHub Actions is intentionally not used as a second scheduler to avoid duplicate queue drains and split operational ownership.

If the scheduler is changed in future, keep exactly one authoritative production scheduler and verify both endpoints return HTTP 200 before considering the worker system healthy.
