# Blackstar Enterprise AI Workforce — three-workflow supervised delivery pilot

**Status:** scoped evidence-gated implementation work for a proposed **£100,000 programme**, **not** a delivered or certified customer workforce. This tranche adds an independent *offline* evidence consistency validator; it does not start agents, grant tools, change approvals or make external writes.

## Reuse the existing Blackstar systems

The proposed programme depends on existing Workforce/agent builder and \`personal_agents\`, \`agent_tasks\`, \`workflow_runs\` and \`workflow_step_runs\` where applicable; Mission Control's \`approval_requests\` and dedicated browser/tool approval paths; \`mission_audit_logs\`; Universal Skills Registry, MCP and current model gateway. **Do not** create a second agent executor, connector manager, audit ledger, policy engine, approval endpoint or data store.

### Three bounded business workflows

| Pilot case | Target buyer outcome | Allowed production behaviour only after verification | Mandatory human gate |
|---|---|---|---|
| \`research_briefing\` | Source-linked weekly market/industry brief | Read from **approved** public domains and buyer-approved documents; save a reviewable draft, not a published claim | Operator approves every browser/tool action under the current effective tool policy; reviewer approves final brief |
| \`customer_triage_draft\` | Classify inbound service requests and prepare draft responses | Draft against approved support policies and permitted service-desk sandbox records; escalate sensitive and out-of-scope requests | Operator approves any external customer-facing send/write; no automatic refund, commitment or disclosure |
| \`engineering_qa_draft\` | Bounded issue-to-test-and-PR preparation | Read an approved repository, produce scoped code/tests in a dedicated QA branch with reviewable evidence | Owner authorises repository tools; no direct merges, Production deployments, branch protection bypass or arbitrary commands |

**These are candidate use cases, not proven running configurations.** The exact \`allowed_tools\` values must be derived from the buyer's approved working tool grants (rather than blindly copying synthetic names), with per-tool domain, network, identity and permission reviews. Agent availability, compatible local model quality, tool persistence and browser approvals must pass actual execution tests first.

## Acceptance evidence required for *each* of the three workflows

1. **Approved execution:** a genuine supervised end-to-end completed run, with the approval decision recorded **before** a permitted tool action and durable audit evidence after the action.
2. **Rejected approval:** a real operator rejection, the associated run stopped, **zero** external tool executions verified through the canonical execution ledger and a denied audit entry.
3. **Denied tool:** an unauthorised or out-of-scope tool request is blocked with **zero** external actions and denial audit evidence. Never exercise a dangerous action against a live destination.
4. **Tool failure:** an approved action deliberately fails against a safe sandbox fixture, the run is failed, failure is audited and any potential side effects or rollback are independently reviewed. This validator does **not** prove rollback.

The buyer must provide a nominated workflow owner, permitted sources, test identities and scoped grants, a reviewer for each outcome, a data/privacy approver, evidence retention rules, a list of prohibited writes and measurable quality/latency/error budgets. Customer-specific exit thresholds must be approved **before** pilots.

## Offline validator

\`scripts/verification/enterprise-workforce-acceptance.mjs\` validates only the *consistency* of an approved, manually normalised evidence export. It requires exactly these **three workflows**, with four distinct trial cases each (12 total), unique run IDs, matching agent/owner associations and chronological approved actions. It detects missing/duplicate audits, unapproved tools, mismatched approvals, execution after rejection, premature tool execution and inappropriate success after failure.

Generate a **fully synthetic** local example:

~~~bash
node scripts/verification/enterprise-workforce-acceptance.mjs --sample > /tmp/blackstar-workforce-synthetic.json
node scripts/verification/enterprise-workforce-acceptance.mjs --self-test
node scripts/verification/enterprise-workforce-acceptance.mjs --input /tmp/blackstar-workforce-synthetic.json
~~~

\`--sample\` and \`--self-test\` use *only synthetic IDs/records*; the sample is a structure reference **not evidence of a real agent run**.

### Normalising approved read-only evidence

- \`agentId\`, \`ownerId\`, \`requiresApproval\` and \`allowedTools\` should come from the exact existing agent/owner configuration, checked under that owner's authority.
- \`run\`: normalise the existing \`agent_tasks\` run ID/status/agent/owner. Where a workflow run uses a different ledger, document the verified mapping to its actual agent task; do not assume IDs are interchangeable.
- \`approval_decision\`: map a decision to the real \`approval_requests\` ID/status/decider/time, and verify \`details.agent_task_id\` / \`task_id\` association (or the corresponding dedicated browser/tool approval association) in the authoritative database.
- \`tool_execution\`: use a *verified* external tool-execution trace, not a generated model message, UI counter, approval row or agent task status. Verify the exact approval's single-use relationship and action outcome.
- \`audit\`: use durable \`mission_audit_logs\` records and independently prove their specific run/action association. Never fabricate a missing audit row merely to pass a fixture.
- \`events[].runId\`, \`agentId\` and \`ownerId\` are normalised relation assertions. The validator checks self-consistency **only**; it does not cryptographically verify that these reflect the authoritative database. Provenance verification is a separate reviewer obligation.
- If the existing ledger does not expose enough verified cross-table identifiers to construct a trustworthy record, mark the trial **BLOCKED** and fix the actual audit/association gap in a separate security-reviewed QA change. **Do not invent or infer a success event.**

Use ISO UTC timestamps, real UUID identifiers, and one event per verifiable outcome. Never upload customer credentials, prompts, browser screenshots, personal information, transcript contents, repository source material or live export JSON to GitHub Actions, PR comments or this repository. The evaluator prints **only aggregate counts** and generic error categories; keep any real sensitive input file in approved local custody.

## Gate meanings and delivery decision

- Exit **0** means **offline evidence contract PASS** only, never live system certification.
- Exit **2** means one or more observed evidence inconsistencies need review.
- Exit **1** means an invalid/incomplete fixture.
- CI only runs the safe synthetic \`--self-test\`. It does **not** sign in, execute browser tasks, send emails, make purchases or write to Supabase.

Even when all 12 offline cases pass, \`liveAgentExecutionTested\`, \`liveApprovalBoundaryTested\`, \`liveAuditPersistenceTested\` and \`customerAcceptanceCertified\` remain **false**. A buyer-ready deployment separately requires actual authorised Preview and sandbox executions for each workflow, real denial/no-action proof, prompt-injection checks, agent quality scoring, tool grant persistence tests, tenant isolation, incident and rollback exercises, commercially feasible support capacity, security/legal/DPA review and signed customer UAT.

## Stack and release rules

Stacked on draft **PR #1041**, itself dependent on #1040, #1036, #1035, #1030 and #1034. Do **not** merge stacked drafts, modify Production, migrate live Supabase, buy model services, bypass approvals or claim three deployed enterprise agents from an offline test. Product pricing remains indicative; no billing or Marketplace updates.
