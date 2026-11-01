# Blackstar QA — tool-policy denial evidence reconciliation (1 November 2026)

**Scope: existing runtime/tool ledger only, QA branch. No database migration, Production write, unrestricted agent autonomy or external action.**

## Verified source/schema mismatch

The original \`tools-core.server.ts\` and \`tools.server.ts\` insert a \`policy_code\` top-level field on failed tool execution records. Blackstar's generated Supabase type for \`public.tool_executions\` declares \`id,user_id,org_id,agent_id,agent_task_id,tool,input,output,status,duration_ms,error,created_at\` but **does not declare** \`policy_code\`. PostgreSQL/PostgREST rejects inserts with nonexistent columns; both runtime log helpers previously ignored the Supabase \`insert().error\`, allowing an action denial to return without evidence. The standalone #1043 acceptance verifier likewise projected nonexistent \`policy_code\`, so a real Supabase GET would fail even though synthetic mocks passed.

This was identified in source review; **no live missing-log incident or customer failure is asserted**.

## Minimal QA-only correction

- The existing \`tool_executions.input jsonb\` field now carries \`{ "redacted": true, "policy_code": "..." }\` when an explicit policy code is supplied. The existing \`policy_code\` *tool output* may remain intact for callers. No new top-level field or migration.
- Both core and extension tool ledger writers detect returned insert errors and fail closed rather than silently treating a missing evidence insert as success.
- On harness or sandbox policy denial, the same existing \`writeAuditRequired\` service-backed writer records an owner/agent/run-linked \`agent.tool_policy_denied\` event, \`status="denied"\`, with only tool name and a bounded policy identifier. A missing required audit entry is an error; no denied action is re-executed.
- The read-only isolated UAT harness requests \`input\` from \`tool_executions\` instead of the nonexistent column; it verifies a redacted code and separately checks that the existing \`mission_audit_logs\` record belongs to the target agent run.
- Strict synthetic mock now rejects unknown tool ledger projections and tests that omitted policy-code evidence blocks certification.
- Vitest contract guards confirm the JSON shape, redaction, schema and the two runtime call sites.

## Acceptance limits

- **Not a claim of a verified Production schema or real signed-in tenant UAT.** The source-derived type is a repository schema contract. Exact deployed database schema and RLS/grants must be checked in a deliberately isolated test database.
- This is a focused fix to **harness and sandbox policy-denial** routes, not a certification of every possible tool failure or all existing approval paths. Other denials may still lack required audit evidence; the separate enterprise UAT remains fail-closed.
- Durable audit writes depend on a correctly configured server-side Supabase client. Tests prove the source contract and mock negative controls; only real authenticated isolated tests can verify actual persistence and owner/member isolation.
- The 12 real workflow runs, no-execution rejection tests, browser-worker receipt verification, prompt injection controls, model quality, customer review and compliance sign-off required in [issue #1044](https://github.com/creativewebdesigneng-stack/palladium-ai-os/issues/1044) remain **BLOCKED/PENDING**.
- Do not merge this stacked QA branch (depends on drafts #1043, #1042, #1041, #1040, #1036, #1035 and #1030), modify Production, bypass approvals, create paid resources or imply the proposed £100k programme is delivered.
