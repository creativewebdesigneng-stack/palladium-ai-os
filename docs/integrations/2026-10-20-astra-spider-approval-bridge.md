# Astra Spider → existing approval and runtime forms

## Scope

This change joins the visual **Astra Spider** network to the *existing*
Blackstar agent, workflow and external MCP execution forms without inventing a
second dispatcher, approval queue, tool connector or audit system.

## Workflow

1. The signed-in AI Hub loads its tenant-authorised live inventory as before.
2. The operator clicks a real Spider node. Only active agents/workflows or
   available configured **external MCP tools** are eligible for preparation.
3. The operator enters the requested task in the Spider's prompt box (required
   for agent/workflow preparation).
4. **Prepare in existing approval controls** validates the selected node
   against the actual inventory (identity, kind, provider, status) and fills
   the existing objective field or opens the existing MCP argument editor.
5. **No network request or execution occurs on preparation.**
6. The user must explicitly click the pre-existing **Execute agent with
   approval / Execute workflow with approval / Request execution approval**
   control; the existing authenticated server functions recheck ownership,
   resource state and approval policy before any execution.
7. When execution is waiting for approval, the UI saves the precise goal or
   MCP JSON used in the original request. Resuming approval submits that
   original payload, not a subsequently edited field.

## Safety

- Never treat Spider topology or status alone as permission.
- Never execute from the graph; no autonomous prompt dispatch.
- No bypass of Blackstar's manual approval flow, agent task execution,
  workforce or MCP service allowlist.
- No UI claim that an animated pulse represents an actual tool result.
- The separate PR #1013 binds approvals to exact payload fingerprints
  at the *server-side claim boundary*. This UI snapshot is complementary
  and not a replacement; merge #1013 and certify real approval-resume before
  claiming end-to-end replay protection.
- No secrets, schema changes or production access are introduced.

## Verification

Unit tests validate eligible selections, missing inventory, spoofed node
identity/status/provider, invalid task input, and static UI wiring to existing
forms and immutable approval payloads.

The already-merged spider graphic remains a read-only visual until a user
explicitly selects an executable node and uses the protected form.

## Vercel deployment blocker

On 20 October 2026 Vercel explicitly rejected an attempted Production
deployment with HTTP 402 and `api-deployments-free-per-day` (Hobby plan,
100 deployments/day). Do not bypass plan limits or call Production live unless
Vercel confirms an exact-code deployment READY. This PR is not deployed.
