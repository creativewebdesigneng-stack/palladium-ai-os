# Blackstar Enterprise Workforce — isolated read-only two-user API UAT

**Status: QA-only candidate. No live acceptance performed.** Extends the existing £100,000 Enterprise AI Workforce proposal and draft #1042. This tool tests persisted agent/approval/tool/audit *evidence* via Supabase's authenticated Data API; it never schedules an agent, approves a tool, browses, creates credentials, modifies a record, provisions infrastructure or accesses Production.

## Scope and authoritative boundaries

- Use the **existing** \`agent_tasks\`, \`approval_requests\`, \`tool_executions\` and \`mission_audit_logs\` tables. Do not add tables or alter policies to make this test pass.
- Supply an **independently isolated, authorised non-production Supabase project**, its public/publishable key and two separate genuine \`authenticated\` test-user sessions. The existing \`isolated-uat-jwt-guard.mjs\` rejects the known Blackstar Production project, service-role/secret keys, anonymous tokens and mismatched test users/sessions. Local JWT claim checks are not signature verification; Supabase itself must validate actual signatures.
- Supply **pre-existing, consented synthetic** owner-owned records for three business workflows and four cases each. Do not create evidence rows by hand to manufacture success.
- Only \`GET /rest/v1/{table}\` is used, with the caller's JWT, explicit projection, scoped IDs and bounded response. For each record type, the unrelated second user must see zero rows under RLS. Missing Data API grants or row evidence must result in **BLOCKED/FAIL**, not an automatic privileged fallback.
- This script verifies \`approval_requests.details.agent_task_id\`, decision/execution state, tool execution ledger status, and existing \`mission_audit_logs\` records including durable approved browser result signals. A staged fixture may expose actual schema or audit linkage gaps; fix root cause in a separate reviewed QA change, do not loosen RLS.
- A successful API result **does not prove** Playwright visited a URL or did not cause side effects; independent authorised browser worker logs, receipt fidelity and signed-in Preview UAT remain essential. An empty table result alone cannot prove zero real-world executions.

## Preparation

The four required trials for each of \`research_briefing\`, \`customer_triage_draft\` and \`engineering_qa_draft\` are \`approved_execution\`, \`rejected_approval\`, \`denied_tool\` and \`tool_failure\`. Use only genuinely recorded tool names and IDs. Every workflow has one \`agentId\` and four distinct \`runId\`s. Approved/rejected/failure cases also have a genuine \`approvalId\`; the denied-tool case uses \`null\` (no approval was queued). Never substitute a model transcript for a tool execution row. **If the runtime cannot produce a denied audit event and policy-code-bearing failure receipt, record BLOCKED rather than creating a fake row.**

Local manifest skeleton (synthetic IDs are examples and **not** accepted as live UAT by themselves):

~~~json
{
  "schemaVersion": 1,
  "scenarios": [
    {
      "id": "research_briefing",
      "agentId": "00000000-0000-4000-8000-000000000100",
      "cases": [
        {"kind": "approved_execution", "runId": "00000000-0000-4000-8000-000000001001", "approvalId": "00000000-0000-4000-8000-000000002001", "tool": "browser_task"},
        {"kind": "rejected_approval", "runId": "00000000-0000-4000-8000-000000001002", "approvalId": "00000000-0000-4000-8000-000000002002", "tool": "browser_task"},
        {"kind": "denied_tool", "runId": "00000000-0000-4000-8000-000000001003", "approvalId": null, "tool": "browser_task"},
        {"kind": "tool_failure", "runId": "00000000-0000-4000-8000-000000001004", "approvalId": "00000000-0000-4000-8000-000000002004", "tool": "browser_task"}
      ]
    }
  ]
}
~~~

For real mode, supply **all three workflows and all twelve distinct cases**, with real approved test-run identifiers only. The limited one-workflow JSON above is intentionally rejected by real-mode validation.

Configure \`BLACKSTAR_UAT_NONPROD=I_CONFIRM_ISOLATED_TEST_DATABASE\`, \`BLACKSTAR_UAT_PROJECT_REF\`, \`BLACKSTAR_UAT_URL\`, \`BLACKSTAR_UAT_ANON_KEY\`, \`BLACKSTAR_UAT_OWNER_JWT\`, and \`BLACKSTAR_UAT_MEMBER_JWT\` via an authorised local secret manager or a secure ephemeral environment. Never paste JWTs into a chat, ticket, CI, source file or PR comment. **Do not copy any values from Blackstar Production.**

~~~bash
node scripts/verification/enterprise-workforce-api-uat.mjs --self-test
node scripts/verification/enterprise-workforce-api-uat.mjs --manifest /secure/local/test-fixtures.json
~~~

Only the first command belongs in CI. It uses mock transport, does **not** contact Supabase and cannot certify any live capability. The second command makes real **read-only** requests after the strict isolated-project preflight passes.

The CLI intentionally emits only aggregate counts and generic failure codes. Never log JWTs, database rows, prompts, customer information or file paths. If the isolated project is not prepared, or if Data API grants prevent authenticated read access to an evidence table, the correct result is **BLOCKED**. Do not create an extra paid Supabase project or migrations without explicit approval.

## Acceptance and release gates

- Exact-head build, strict typecheck, high-severity dependency audit, Vitest, isolated PostgreSQL and offline self-test must pass.
- **Real** signed-in RLS owner-vs-member negatives and original approval/execution/audit records must then be checked in an approved isolated environment.
- Independently verify worker-side browser request/extraction source, no external action after rejection, denied private-host boundary, member revocation and error behaviour without replaying a dangerous action.
- The company's named buyer and security owner must approve output quality, isolation, operating support, rollback plan, contractual scope and UAT.
- The CLI's \`api_evidence_consistent\` is only an evidence consistency gate, not customer acceptance. \`customerAcceptanceCertified\` and \`browserWorkerSideEffectVerified\` remain \`false\`.

**Do not merge dependent draft PRs, modify Production or deploy this verification harness to customer-facing runtime.**
