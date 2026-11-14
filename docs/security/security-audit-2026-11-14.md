# Security and infrastructure audit — 14 November 2026

Worker notes for the Blackstar completion pass. Production was not contacted. No migration was applied to a hosted database.

## Dependency audit

`bun audit` on `main` after pull request #1061 reported no high-severity advisories. It still reported 30 lower advisories (26 moderate, 4 low): `qs`, `glob`, `@hono/node-server`, `ip-address`, `@vitest/mocker`, `minimatch`, `fast-uri`, `hono` and `esbuild`.

Those were cleared by upgrades, not by suppressing advisories:

- `e2b` 2.64.0, which depends on patched `glob` 14.
- `vitest` 5.1.0, which brings `@vitest/mocker` 5.1.0.
- Direct overrides for patched `qs` 6.17.1, `glob` 14.0.6, `@hono/node-server` 2.1.8, `ip-address` 10.7.6, `hono` 4.13.18, `esbuild` 0.28.2, `fast-uri` 3.1.9, `minimatch` 11.0.8 and `brace-expansion` 5.0.13.
- `@modelcontextprotocol/sdk` override moved from 1.32.1 to 1.32.2. The SDK already allows `@hono/node-server` 2.x and `hono` 4.13.

`bun audit --audit-level low` then reported no vulnerabilities. CI now fails on low, moderate and high advisories. A network failure talking to the audit service still retries once and continues only when no advisory result came back. That is the existing availability behaviour, not an ignore file.

`nitro` still vendors a copy of `glob` 13 inside `nf3/dist/node_modules`. Bun's audit graph does not install that copy as a package, so the audit is clean. Replacing the vendored folder would mean forking `nitro`. Left as a residual.

## Supabase row level security

A static pass over 314 migrations, followed by reading the dynamic `execute format` blocks, found row level security enabled for application tables. Health, retail, construction and compliance owner policies are created in loops, which a naive text search misses. The loops scope rows with `auth.uid() = user_id`.

These tables enable row level security and grant no client policies on purpose. They are service-role or fail-closed:

- `billing_webhook_events` (client grants are now revoked as well)
- `platform_settings`
- `food_delivery_webhook_receipts`
- `runtime_worker_credentials` (select for service role only, and even that grant is revoked again by the token-verifier migration)
- `website_studio_form_rate_limits`
- `compliance_sync_runs`

`using (true)` remains only on authenticated reads of published catalogue data: active plans, marketplace reviews and seller profiles, creator profiles, and the compliance regulation catalogue. Writes on those tables are owner-scoped. Anonymous review reads were removed by `20260911124000_harden_marketplace_anonymous_read.sql`.

Storage buckets created in migrations are private (`public = false`). `knowledge`, `game-foundry`, `website-studio-assets`, `trusted-media` and `three-d-studio` restrict object paths to the caller's user id. `cinema-hf-outputs` has no client storage policies; the server signs a URL only after it has checked the media job. The 3D Studio upload path added in #1061 uses the same owner-prefix rule, and the server functions require a signed-in user before they sign an owned object.

Security definer functions in the migrations set `search_path` in the function header (85 of 85 in the static pass). The new economy triggers use `security invoker` and `search_path = ''`, and only `service_role` can execute them.

## Server functions and secrets

860 server functions call `requireSupabaseAuth`. Three do not:

- `listPlans` reads active plans with the publishable key. The comment and the `plans` select policy make that public catalogue intentional.
- `getFinanceEconomicData` fetches the public Bank of England series. It does not read tenant data.
- `bootstrapPlatformAdmin` created or reset the platform admin using the service role with no caller check. It now stays disabled unless `ADMIN_BOOTSTRAP_ENABLED=true` and the request presents `ADMIN_BOOTSTRAP_TOKEN`. Both values are server env vars. A wrong token returns the same error as a disabled bootstrap. The response no longer includes the admin email or user id.

`supabaseAdmin` is imported from server modules, not from React screens. `src/lib/public-config.ts` serialises only the public Supabase URL, publishable key and project id.

The tracked `.env.development` file held a Stripe publishable test token. It is now a placeholder. Older history also contains Supabase publishable keys in a since-untracked `.env`. Those keys are public by design. Rotate them if the accounts are still active. History was not rewritten.

Secret scanning runs in `.github/workflows/secret-scan.yml` with gitleaks 8.30.1, checksum-pinned, on the current tree. Fixture files are allowlisted in `.gitleaks.toml`. `.env` files are not allowlisted.

## Knowledge storage

PR #1037 and PR #1038 are not ancestors of PR #1048, and their storage migrations are not on main. #1048 does not carry either storage file. `20261114212000_knowledge_storage_restrictive_owner.sql` is the single additive replacement. It keeps the existing owner-prefix policies and adds restrictive checks plus live organisation membership. See `docs/security/knowledge-storage-rls.md`.

## Preview and provider tests

`bun run preview` no longer calls `vite preview`. That command loads `dist/server/server.js`. The Nitro cloudflare-module build emits `.output/server/index.mjs`, which `wrangler dev` serves. `@playwright/test` and `wrangler` are dev dependencies for click-level e2e and that preview.

`bun run test` exits immediately, with one message, when `OPENAI_API_KEY` is unset. CI already sets the non-secret placeholder `ci-test-provider-placeholder`, and the provider tests still run in full when that variable is present.

## Issue #966

The idempotent migration and the operator steps are in `docs/security/agent-economy-production-apply-plan.md`. Backup and Vercel rollback steps are in `docs/security/backup-recovery-and-deployment-rollback.md`. The migration was not applied to production.
