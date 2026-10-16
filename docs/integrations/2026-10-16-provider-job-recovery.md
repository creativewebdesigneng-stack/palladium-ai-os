# Provider job authority recovery

Restores the existing `media_edit_jobs` and `deployment_targets` ledgers. No production jobs, targets, worker connections or provider actions are created. Both tables retain owner-scoped authenticated reads and allow mutations only through the existing trusted server client. Users cannot forge worker job IDs, remote resource identities or execution status with direct Data API writes.

Media creation requires a confirmed server ledger insert, then a persisted required audit entry before worker submission. The server persists only the returned worker identity with explicit owner filters and a write receipt. Refresh reads the owner's ledger through caller RLS, polls its recorded worker ID, then updates the matching owner/job/worker receipt through the server. Worker IDs are unique in the ledger. Credential errors never fall back to client mutations.

Auto-Editor no longer defaults to an unrelated public endpoint or sends unauthenticated requests. An explicitly configured HTTPS endpoint and server token are required. Source URLs must use HTTPS without embedded credentials and pass the existing public-network DNS guard. The implemented worker capability remains silence editing with MP4/MOV output; the screen now shows those options and distinguishes configured from proven online. Completed responses require an HTTPS output URL.

Coolify uses the existing platform-admin role check before saving targets or dispatching any deploy/restart/stop action through the shared server credential. Even admins must select their own persisted target. An audit entry must be persisted before dispatch. The screen disables management for ordinary users. The endpoint paths retain the documented Coolify POST API contract: [deploy](https://coolify.io/docs/api/endpoints/deployments/deploy-by-tag-or-uuid), [restart application](https://coolify.io/docs/api/endpoints/applications/restart-application-by-uuid), [restart database](https://coolify.io/docs/api/endpoints/databases/restart-database-by-uuid). No production resource is contacted by these tests.

Both provider paths share the existing public-network DNS guard through a small credentialed HTTP helper. It requires HTTPS configuration, rejects embedded credentials/query/fragment configuration, refuses redirects, uses a 20-second fetch/body deadline, bounds JSON responses to 256 KiB, and omits upstream error bodies from errors. There are no automatic retries of external actions.

## Limits

Configured credentials are not a live connection certificate. Real worker processing, worker-side redirect/egress restrictions, media ownership at its source, provider permissions, tenant isolation, output retention/deletion and Coolify actions require authenticated integration certification. DNS validation before fetch is not connection-time IP pinning; the existing network guard explicitly requires deployment egress filtering against rebinding. No such remote infrastructure controls are claimed here. Unauthenticated default worker access remains disabled. Tenant-owned Coolify credentials are not introduced; this shared connection stays administrator-only.

The isolated Postgres suite verifies RLS, privileges, owner isolation, immutability against caller writes, worker identity uniqueness, constraints and owner deletion. Application tests mock provider requests and verify required audit, roles, ownership, no privileged fallback and bounded network behavior.

Migration `20261016105636_restore_provider_job_authority.sql` is applied. Live verification confirms RLS, no client mutations, no anonymous reads, and zero media jobs or deployment targets. The production build, 2,765 application tests and 42 isolated Postgres checks passed.

The archive preservation recheck still finds 176 scientific reference records (120 ok, seven warning, 49 dangerous), all disabled with no executable dependencies. Diagram Design remains one ok, disabled reference with no executable dependencies. The 177th scientific record remains unimported; this migration does not bypass the secure importer or its required audit boundary.
