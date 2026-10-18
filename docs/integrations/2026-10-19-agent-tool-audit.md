# Agent tool audit — 19 October 2026

This audit separates runtime boundary tests from live provider acceptance. An active
catalogue row or passing mock-backed contract is not proof of a connected provider.

| Area | Evidence | Status |
| --- | --- | --- |
| Browser navigation/extraction | Real Groq agent task 0b2a7631-da37-496b-b90b-dba9025915d0; approval 1871cf3d-e8b5-46cc-a718-c5d13c930de0; Playwright, simulated=false; two steps; 3,595 body characters; complete original receipt and five successful audits | Live pass |
| All 41 registered tools | Every tool denied without a grant and excluded by an explicit disabled assignment; actual resolver/executor called with in-memory persistence | Boundary tests pass; not 41 live integrations |
| Fourteen local extensions | Global/catalogue approval requirements cannot be overridden by false per-tool flags; domain and spend policies retained; approval-required execution blocked before dispatch | Regression coverage |
| Calculator, data analysis, current time | Real implementations called directly with known arithmetic/statistics and a bounded actual clock check | Implementation tests; no model or external provider |
| QA feature agent | Signed-in live attempt reported Gemini not configured for this Preview before creating a task or calling tools | Live blocked |
| Connected services | Read-only inventory for the QA owner returned zero integrations | Live blocked pending connections |
| External MCP | Read-only inventory for the QA owner returned zero configured servers | Live blocked pending configuration |
| Writes, purchases, messages and memory writes | No live side-effecting acceptance attempted; existing approvals preserved | Not live verified |
| Original Quality Assurance agent | Saved provider/model is openai/Gemini; assigned obsolete slugs web, files, workflow, api alongside browser | Configuration repair required |

## Defects repaired

The local extension wrapper previously forced most approval grants to false and
discarded domain/spend limits. It now combines global, catalogue and per-tool
approval requirements, preserves the resolved constraints and stops before dispatch
when approval is required. It does not fabricate an executable approval or silently
relax policy. Approval-gated extension execution still needs an applicable existing
approval executor; unsupported paths fail closed rather than claiming success.

The runtime previously silently dropped unsupported saved tool names, allowing an
agent to run with fewer tools than its saved configuration suggested. Preflight now
rejects those assignments before creating a task, with instructions to use the
existing tool editor. It never maps obsolete aliases into broader permissions.

No Production application deployment, account connection, credential change, live
message, purchase or permission relaxation was performed for this audit.
