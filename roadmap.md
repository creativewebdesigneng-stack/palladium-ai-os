# Blackstar productisation roadmap

HEAD `daf0b77` (ancestor of `194141d` confirmed). Audit of all ten modules + integration points complete; no code edited yet.

## In progress (eight-step plan) — ready to implement, in order
- [ ] 1. Self-healing: `decideRecovery` (`src/lib/ai-hub/self-healing.ts`) becomes the policy layer inside `classifyPlannedToolFailure` (`src/lib/runtime/planner-tool-recovery.server.ts`). Map: approval-wait -> no-op; ambiguous external -> `mutationOccurred:true` (pause_for_approval unless checkpoint); safe read + approval-free grant -> `transient`, attempt=`plan.replan_count`, maxRetries=`plan.max_replans`; `retry` => existing replan path; `rollback` only when a `DurableRunCheckpoint` exists (`run-checkpoint.server.ts`); `fail_closed`/`pause_for_approval` surface reason. Return `healing: HealingDecision` on `PlannedToolRecovery` (additive). Tests in `src/lib/runtime/__tests__/`.
- [ ] 2. Computer-use gate: call `buildBlackstarComputerUsePlan` in `src/lib/runtime/browser-task.server.ts` and `stateful-browser-tool.server.ts` before dispatch (map existing step kinds -> `BlackstarComputerUseAction`, allow-list from session `allowed_domains`); blocked -> fail closed with reason; `requiresApproval` -> existing `approval_requests` path. Add `policyPlan` summary to `getBrowserControl` (`src/lib/browser/browser.functions.ts`) and render verdict panel on `src/screens/ComputerControl.jsx`.
- [ ] 3. Opportunity execution: new `src/lib/ai-hub/opportunity-execution.functions.ts` (`requireSupabaseAuth`, zod) wrapping `planBlackstarOpportunityExecution` over `createPalladiumAiHubRegistry()` orchestrator; approvals via `createAiHubApprovalGate`; "Recommended actions" panel on `src/screens/AutonomousOS.jsx` (pattern: `useServerFn` + `useQuery` + `useSessionReady` + `friendlyMessage`).
- [ ] 4. Provenance: append `createProvenanceEvent` next to `agent_activities` inserts in `src/lib/runtime/runtime.server.ts` (store chain in existing activity `details`/metadata JSON, no new table); read-only "why" trail + `verifyProvenanceChain` on run detail surface.
- [ ] 5. Dynamic teams: in autonomous goal planning (`autonomous-os.scheduler.server.ts` / fleet assignment), when no `autonomous_goal_fleet_assignments` row exists use `formDynamicAgentTeam` over the user's active `personal_agents` (capabilities from agent skills/tools, trust from verification score).
- [ ] 6. Multimodal perception: `buildBlackstarPerceptionPlan` gate on agent-run uploads/attachments before model call; restricted -> approval; blocked -> reject with reason.
- [ ] 7. Decision Studio: authenticated server fn returning `buildBlackstarOptimizationPlan` + `rankCounterfactuals` over real metrics; panel on `src/screens/AIHub.jsx`; no auto-execution.
- [ ] 8. Shared workspace + intelligence graph: `buildBlackstarSharedWorkspacePlan` over existing workspace tables (`src/hooks/use-workspace.ts`); `buildIntelligenceGraph` over memory fabric provenance links. No new tables.
- [ ] Branding: PalladiumAI -> Blackstar in touched routes/screens/metadata (e.g. header comment in `planner-tool-recovery.server.ts`, route `head()` titles under `src/routes/_shell/_app/`).
- [ ] Verification: production build, `tsgo` strict typecheck, full `bunx vitest run`, browser-worker policy checks — fix until green.

## Constraints (from user)
- No mock execution, no duplicate runtimes/stores, no credential exposure, preserve auth/RLS/approvals.
- Pause only if a destructive migration or credential/security change becomes necessary.
- Do not deploy production.

## Ready (discovered)
- `src/lib/ai-hub/index.ts` barrel already exports all ten modules; new `*.functions.ts` files must not be re-exported from the barrel if the barrel is imported client-side with server-only deps.
