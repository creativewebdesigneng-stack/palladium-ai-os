# Blackstar capability-module audit and productisation plan

Note on commit: the requested SHA `194141db…` is not the checkout in this workspace. Audit was performed against the current project HEAD `92fb045444c3d8124e23b487a1db24cec2250a77`. If the two differ materially, re-run the audit after the source refresh.

## Audit result

Every one of the ten modules is **library + unit tests only**. None is imported by a server function, the agent runtime, or any page. Confirmed by searching all of `src/` for each module path and for each exported entry point (`planBlackstarOpportunityExecution`, `buildBlackstarSharedWorkspacePlan`, `buildBlackstarOptimizationPlan`, `buildBlackstarPerceptionPlan`, `evaluateCounterfactual`/`rankCounterfactuals`, `decideRecovery`, `appendProvenanceEvent`/`verifyProvenanceChain`, `buildIntelligenceGraph`, `formDynamicAgentTeam`, `buildBlackstarComputerUsePlan`) — the only hits outside `src/lib/ai-hub/` are unrelated word matches.

| Module | (a) lib/test | (b) auth API | (c) runtime | (d) user-facing |
|---|---|---|---|---|
| opportunity-execution | yes | no | no | no |
| shared-workspace | yes | no | no | no |
| optimization | yes | no | no | no |
| multimodal-perception | yes | no | no | no |
| counterfactual | yes | no | no | no |
| self-healing | yes | no | no | no |
| provenance | yes | no | no | no |
| intelligence-graph | yes | no | no | no |
| dynamic-teams | yes | no | no | no |
| computer-use | yes | no | no | no |

Adjacent systems that already do the real work (so the modules must plug into them, never replace them):

- Recovery: `src/lib/runtime/planner-tool-recovery.server.ts`, `run-checkpoint.server.ts`, `run-resume.server.ts` — self-healing must become the decision layer these call, not a second recovery engine.
- Computer control: `src/lib/browser/browser.functions.ts` + `src/lib/runtime/browser-task.server.ts`, `stateful-browser-tool.server.ts`, surfaced by `src/screens/ComputerControl.jsx` — computer-use is the missing pre-flight policy gate for these.
- Approvals: `src/lib/ai-hub/approval.server.ts` (writes `approval_requests`), `src/lib/runtime/workflow-approval.server.ts`, `workflow-approval-decision.server.ts`.
- Execution boundary: `src/lib/ai-hub/execution.functions.ts` → `execution.ts` → `orchestrator.ts` / `registry.ts`.

## Patterns to reuse (do not invent new ones)

- Server function shape: `createServerFn({ method }).middleware([requireSupabaseAuth]).inputValidator(zod).handler(...)` with `context.supabase` / `context.userId`, as in `src/lib/runtime/autonomous-os.functions.ts`.
- Page shape: `PageHeader` + `useServerFn` + `useQuery`/`useMutation` + `useSessionReady` + `friendlyMessage`, as in `src/screens/AutonomousOS.jsx`; route file under `src/routes/_shell/_app/<slug>.tsx` with its own `head()` (pattern in `src/routes/_shell/_app/autonomous-os.tsx`).
- Inventory/discovery surface: `src/lib/ai-hub/resources.functions.ts` + `src/screens/AIHub.jsx` filter chips.
- Barrel export: `src/lib/ai-hub/index.ts`.

## Implementation plan, highest value first

1. **Self-healing into the live runtime.** Call `decideRecovery` from `planner-tool-recovery.server.ts` so retry / reroute / rollback / pause-for-approval is one policy decision, reusing existing checkpoints and the approval gate. Highest value: it fixes real run failures with no new UI.
2. **Computer-use gate before browser actions.** Run `buildBlackstarComputerUsePlan` inside `browser-task.server.ts` / `stateful-browser-tool.server.ts` before dispatch; blocked steps fail closed, approval-required steps go through `approval_requests`. Show the plan verdict on `src/screens/ComputerControl.jsx`.
3. **Opportunity execution API + Autonomous OS surface.** New `src/lib/ai-hub/opportunity-execution.functions.ts` (authenticated) wrapping `planBlackstarOpportunityExecution` over the existing orchestrator, rendered as a governed "recommended actions" panel on `src/screens/AutonomousOS.jsx`, approvals via the existing gate.
4. **Provenance chain persisted for runs.** Append `createProvenanceEvent` records alongside existing `agent_activities` writes and expose a read-only "why" trail on the run detail surface; verification via `verifyProvenanceChain`.
5. **Dynamic teams behind fleet assignment.** Use `formDynamicAgentTeam` when `listAutonomousFleetAssignments` has no assignment, so goals get a capability-covered team instead of a manual pick.
6. **Multimodal perception gate on uploads** used by agent runs (size/duration/sensitivity ceilings, restricted inputs require approval).
7. **Optimization + counterfactual as one "Decision Studio" panel** on the AI Hub: ranked candidates with blocked/approval reasons shown, no auto-execution in this tranche.
8. **Shared workspace and intelligence-graph last** — both need storage decisions; propose reusing existing workspace tables (`src/hooks/use-workspace.ts`) and the memory fabric provenance links rather than new tables.

Each step is one tranche: server boundary test + pure mapping tests, targeted vitest, strict typecheck, production build. No schema changes in steps 1–3, 6, 7.

## Files inspected

`src/lib/ai-hub/` — `index.ts`, `opportunity-execution.ts`, `shared-workspace.ts`, `optimization.ts`, `multimodal-perception.ts`, `counterfactual.ts`, `self-healing.ts`, `provenance.ts`, `intelligence-graph.ts`, `dynamic-teams.ts`, `computer-use.ts`, `execution.functions.ts`, `approval.server.ts`, `resources.functions.ts`, and the matching files in `__tests__/`.
`src/lib/runtime/` — directory listing plus `autonomous-os.functions.ts`, `planner-tool-recovery.server.ts`, `run-checkpoint.server.ts`, `browser-task.server.ts`, `stateful-browser-tool.server.ts`, `workflow-approval.server.ts`.
`src/screens/` — `AutonomousOS.jsx`, `AIHub.jsx`, `ComputerControl.jsx`, `AgentWorkspaces.jsx`.
`src/routes/_shell/_app/` — `autonomous-os.tsx`, `ai-hub.tsx`.
