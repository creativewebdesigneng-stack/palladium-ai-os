# Developer API recovery

Restores the existing `api_keys` and `api_request_logs` contracts without creating keys, traffic, subscriptions or provider executions in production.

## Authority

Authenticated clients can read their own key metadata and request logs. They cannot read hashes, insert keys, change scopes, forge telemetry or erase quota history. The existing authenticated server functions generate raw keys, store SHA-256 hashes through the existing server client and return raw material once, after a confirmed write. There is no credential fallback to caller writes.

Key creation uses a service-only invoker RPC with a per-owner transaction lock. The existing TypeScript plan limits remain authoritative; only the trusted server supplies those limits. Active, unexpired keys consume slots. Revoked/expired keys cannot be revived through rotation. Owner filters and a conditional revoked-state write protect rotation and revocation; usage is retained during rotation. Portal subscription resolution is explicitly scoped to the caller's personal subscription, matching the personal keys that this portal creates.

Public API authentication denies empty scopes and invalid expiration evidence. Lookup, subscription and quota storage failures return an authorization-storage error instead of authenticating against fabricated zero usage. Every wrapped API handler reserves a request-log row before running. A service-only invoker RPC rechecks the hash, owner, scope, revocation, expiry and per-user quotas under a transaction lock, then writes the reservation and increments key usage atomically. Failed reservation never runs a handler. Completion updates that row; an interrupted request remains status `0` and still consumes quota. A completion-logging failure does not falsely report a completed POST as retryable. Reservations are not a general idempotency system: clients must not replay effectful requests indiscriminately.

The isolated Postgres suite checks grants, RLS, owner/key association, secret visibility, constrained scopes, service-only RPC execution, quota receipts, pending-request accounting, revocation, expiry and deletion semantics. It executes serialized statements in PGlite; it does not simulate concurrent production connections. PostgreSQL transaction advisory locks provide the concurrency boundary.

## Verification limits

Applied migration `20261016104722_restore_developer_api_authority.sql`. Live verification confirmed both tables have RLS, no authenticated insert/update/delete grants, no anonymous reads, and no authenticated hash-column access. Both RPCs are invoker functions, executable by the trusted service role and denied to authenticated/anonymous callers. Both tables remain empty. The isolated database suite passed 61 checks; all 2,733 application tests and the production build passed.

Unit tests use generated fixture keys only in memory and mocked server storage. No production API key is minted or exposed. The usage dashboard retains its existing maximum-500-row sample; its displayed aggregates are not a billing ledger or a complete high-volume 24-hour report. Live authenticated key creation and public API execution remain uncertified while the known deployed server credential problem is unresolved. Nothing here bypasses that credential check, approvals or scanning.
