# Astra Spider — intelligence web visualisation

## Objective

Build a spider-web-style decision visual within Blackstar AI Hub inspired by
the public concept demonstrated by the TikTok creator @shazamob (a prompt
decision network). This is Blackstar's own implementation, not an imported
copy of third-party software or unverified source code.

## Existing architecture reused

- `src/lib/ai-hub/router.ts` selects candidate capabilities using the
  already-existing evidence-gated routing policy.
- `src/lib/ai-hub/resources.functions.ts` returns signed-in, tenant-scoped
  resource inventory. The graph does not fetch a second catalogue.
- `AiHubDecisionExplorer` owns the existing capability/objective controls and
  passes the computed route to `AiHubSpiderNetwork`.
- `src/lib/ai-hub/spider-network.ts` projects that route and inventory into
  a bounded graph, including registered resources, eligible candidates and
  the planner's selected resource. It does not create another router.
- The existing `AiHubNetworkScene` remains available on the same page below
  the new Decision Network.

## Visual behaviour

- Animated radial spider-web geometry, node arcs and a proposed-route pulse.
- Blackstar/Astra central intelligence node.
- Real resource nodes spanning registered models, tools, agents, workflows,
  MCP, compute and datasets. A round-robin selection prevents one provider
  type crowding out everything else.
- Coloured edges distinguish inventory links, eligibility and the currently
  selected planning path.
- Mouse/touch/keyboard node inspection reveals existing inventory identity,
  status, provider and whether it was considered in the current plan.
- Respect OS reduced-motion preference and provide a pause button.
- Display planner evidence and explicit unverified status for relevance,
  grounding and ambiguity until trusted prompt assessment is integrated.

## Non-negotiable truth conditions

1. This is a **visualisation of a planning result**. No model or tool is
   executed; pulses are not runtime telemetry or messages being sent.
2. Registered nodes come solely from the inventory already authorised for
   the signed-in user. Missing capabilities cannot be invented.
3. Concentric web rings are presentation scaffolding, not factual edges.
   Distinct edge colours mean registered / candidate / selected plan.
4. Confidence numbers are not claimed to be calibrated, and the source
   signals are labelled as unverified when no trusted checker ran.
5. No relaxation of human approval, connector permissions, budget,
   deployment or audit policy. No changes to Production or database schema.

## Verification

`spider-network.test.ts` verifies projection bounds, diversification,
stable layout, source-backed nodes, honest selection, missing data and
UI non-execution contracts. Existing `decision-explorer.test.ts` and
`network-scene.test.ts` must remain passing.

This is the spider-style front-end and planning projection. The full goal
of prompt-input parsing, trusted evidence assessment and audited provider
execution will require the next separately certified runtime integration.

## Prompt-entry preview

The explorer now offers a local prompt box and a conservative literal-phrase
matcher that can suggest an existing registry capability (e.g. the words
"code analysis" match the registered "code-analysis" capability, if present).
The user must explicitly apply the suggestion before routing changes.

This is intentionally **not semantic classification or an LLM call**. The
input remains in local component state and is not submitted to the model,
worker, audit service or approval system. Unknown prompts get no
suggestion. The selected capability and routing objective still govern the
existing read-only planner.

The longer-term work is an actual server-verified prompt relevance, grounding
and policy assessment service, with trusted execution evidence linked to
existing approvals and audits.
