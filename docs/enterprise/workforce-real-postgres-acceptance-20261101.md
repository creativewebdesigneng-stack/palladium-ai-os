# Blackstar Enterprise Workforce — isolated real PostgreSQL verification

## Purpose and provenance
This uses the real PostgreSQL engine embedded by @electric-sql/pglite, running real SQL grants, owner/member RLS and triggers in CI. It applies the **unaltered committed** approval foundation (20260920200500), backend-only approval evidence (20260920205500), and audit-privilege-hardening (20260930235114) migration files. Surrounding agent/task/tool-execution and audit SELECT schemas/policies are **explicitly synthetic fixtures**, not a copy of deployed production database policies.

This materially improves on source assertions and mock HTTP responses, but **does not run Astra, Playwright, a connected Supabase project, a customer tenant, or a real human approval**. It does not validate deployed schema drift or certify an enterprise sale.

## Isolated tests
- The authentic approval migration allows a synthetic owner to queue pending approval requests and rejects immutable-payload edits or reversal of terminal decisions.
- Real column grants and triggers prevent an authenticated owner from forging provider execution status, timestamps or results, while the service-role fixture can transition approved to executing to succeeded. Rejected approvals do not execute.
- The authentic audit privilege migration prevents authenticated writes, updates and TRUNCATE. Owner/member/anon audit and tool-row visibility use explicitly synthetic owner-only RLS policy fixtures.
- Real PostgreSQL JSONB reads an existing redacted input.policy_code while rejecting the nonexistent top-level policy_code column.
- All identity IDs and ledger receipts are synthetic; a fabricated SQL fixture is never interpreted as proof that a Playwright worker ran.

CI file: .github/workflows/enterprise-workforce-ledger-postgres.yml. Script: scripts/verification/enterprise-workforce-ledger-postgres.mjs. Run with node after installing locked dependencies. No network to Supabase/agent services or live customer records.

## Outstanding Mission #1044 acceptance gates
The **twelve live trials** require a confirmed and expressly authorised isolated non-Production Supabase project, two genuine signed-in test-user sessions, working Preview model/provider, bounded Playwright worker, actual human approval decisions and independently verified tool/audit receipts. The alternative connected project has not been approved for this use; a read-only schema inspection on 1 November timed out.

Once these are available, run the already implemented read-only authenticated acceptance script, verify browser worker evidence independently and have buyer/security owners sign off. Never use Production JWTs, loosen RLS to make tests pass, invent evidence, merge dependent PRs or claim live buyer acceptance based on these isolated SQL checks. This QA change adds no Production deployments, paid infrastructure or remote migrations.
