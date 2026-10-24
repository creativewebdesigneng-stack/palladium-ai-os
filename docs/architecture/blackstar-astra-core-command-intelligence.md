# Blackstar Astra Core — sovereign platform intelligence programme

**Decision:** Make the existing Blackstar Astra-class intelligence engine the coordinating intelligence of Blackstar, rather than create a parallel agent operating system or prematurely claim a new foundation model.

## What already exists

- Blackstar Astra engine identity and configurable OpenAI-compatible serving route (an identity and runtime slot, not proof that proprietary weights have been trained).
- Native Intelligence model routing gated by verifier-owned evidence and task-class certification.
- General Intelligence kernel, direct/delegate/collective routing, existing Orchestrator, Workforce and Mission Control.
- Autonomous OS scheduler, owner-scoped goals, run status, operator master stop, audit and approvals.
- AI Hub, provider/model routing, Universal Skills Registry, MCP, browser and 3D/Cinema workers.
- Astra Spider visualising available resources and durable approval evidence.

**Do not rebuild these.** The core intelligence coordinates them through existing contracts.

## Control-loop architecture

1. **Observe:** Read *authenticated, owner-scoped* registered capabilities and operational health. Distinguish supported and certified from unavailable, simulated, stale or uncategorised.
2. **Understand:** Convert operator objectives into bounded General Intelligence goals, with explicit success criteria, allowed organisation, risk and spending budgets.
3. **Plan:** Reuse the existing General Intelligence kernel, Orchestrator and AI Hub provider routing to select already authorised specialists, models and tools.
4. **Authorize:** Keep existing permissions, approval requests and human controls authoritative. No change to external actions, payments, security settings, deployments or irreversible mutations without their required approval.
5. **Execute:** Delegate through existing agent tasks, Workflows, MCP, browser and specialist worker adapters; never call a tool that a user/agent has not been granted.
6. **Verify:** Require exact persisted owner/resource/task success and real evidence before advancing dependencies or reporting complete. Pauses remain pauses, failures remain failures.
7. **Recover:** Reuse existing bounded retry, checkpoint, rollback and operator emergency-stop controls. Do not self-authorise recovery or conceal missing evidence.
8. **Learn:** Only from audited, permission-safe, independently verified outcomes; do not ingest untrusted worker text as privileged instructions.

## Development phases

**Phase 1 — Trustworthy coordination:** Fix false-success paths for direct, delegated and synthesis General Intelligence work, preserve nested approvals and test absence of canonical records. This PR delivers that first bounded step and reuses the owner-scoped run verifier introduced in PR #1022.

**Phase 2 — Platform-wide observation:** Extend existing autonomous/Mission Control observability with separate verified health evidence for agents, stores, studios, browser workers, model providers, connectors, resources and cost budgets; do not duplicate their databases or inventories.

**Phase 3 — Assisted operational coordination:** Plan and delegate across existing business, product, website, finance, research, Game Foundry, 3D and Cinema components. Start read-only and sandboxed, then progressively certify action classes with existing approvals, tenant isolation and per-tool tests.

**Phase 4 — Blackstar-owned inference:** Keep the existing model gateway. Select properly licensed open weights and a controllable inference host, gather consented/rights-cleared datasets, train adapters or specialised small models, validate on separate holdout tasks and register only genuinely qualified task classes. Blackstar branding is not evidence of independently trained weights. Third-party inference can remain as explicit fallback.

**Phase 5 — Operation at scale:** Introduce measured SLOs, fault budgets, resource quotas, anomaly review, operator-supervised policy changes and real end-to-end evaluation. Enable any increased autonomy only after live certification.

## Required acceptance gates

- Exactly owned task ID, agent/workflow resource ID and `user_id` must be confirmed by authenticated canonical database rows with persisted `succeeded` status.
- An awaiting approval, missing result, inaccessible record, failed/cancelled task or stale result must never be called completed, delegated into downstream work, or used as consensus evidence.
- Browser, MCP, finances, store writes, social posts, payments, deployments and destructive actions stay under current permission/approval policies.
- Real browser/worker execution and audit evidence must be observed, not mocked into acceptance.
- Require green build, strict TypeScript, regression tests and dependency audit before a matching Vercel Preview. Production remains unchanged until exact-commit readiness and operator acceptance are verified.
- Do not call Astra AGI, equivalent to proprietary frontier models, or wholly autonomous until independently demonstrated.

**Integration dependency:** PR #1022 must land first; this PR is stacked on its branch and must be retargeted only after reviewing the verified merged main.
