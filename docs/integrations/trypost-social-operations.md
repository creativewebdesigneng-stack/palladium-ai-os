# TryPost → PalladiumAI Social Operations

## Source and licence

The supplied TryPost archive was audited as a product/architecture reference. Its source is licensed **AGPL-3.0-only**. PalladiumAI does not copy TryPost source code, templates, migrations, UI components, provider implementations, queue workers, or other implementation text.

This integration is a clean-room PalladiumAI implementation of useful product concepts identified during that audit.

## Native capability transferred

PalladiumAI Social Operations provides:

- owner-scoped social content plans and schedules;
- per-post provider targets;
- campaign, labels, media metadata, status and post-level metrics storage;
- live destination discovery from PalladiumAI's existing provider-neutral integration runtime;
- server-side validation of provider/action payloads before a target can be attached;
- an authenticated Social Operations workspace;
- agent planning/scheduling through the `social_ops` tool;
- existing `integration_action` execution for external publication so provider transports and approvals stay authoritative.

## Existing PalladiumAI systems reused

The following TryPost concepts are intentionally **not** duplicated:

- authentication, accounts and workspaces → PalladiumAI auth and organisations;
- OAuth/provider credentials → PalladiumAI Integrations and encrypted server-side credentials;
- social provider transport → PalladiumAI direct API / connector / browser execution fabric;
- AI generation → PalladiumAI model gateway and agents;
- workflow automation and queues → PalladiumAI Workflows, Agent Runtime and task execution;
- approvals → PalladiumAI immutable `approval_requests` lifecycle;
- MCP → PalladiumAI MCP runtime;
- billing/subscriptions → PalladiumAI billing and entitlements;
- generic analytics infrastructure → PalladiumAI analytics/audit systems.

## Security boundaries

- Social tables do not store provider access tokens, refresh tokens, passwords or API keys.
- Editable JSON is rejected when credential-like keys are present.
- A social target can be attached only after `prepareIntegrationAction` validates a live provider/action through the authenticated user's existing connection.
- `social_ops` does not expose an external publish action. Agents use the existing `integration_action` tool for external publication, preserving Harness policy, live adapter selection, immutable approval payloads and transport pinning.
- Row-level security restricts social posts and targets to their owner.

## Deliberate scope decisions

This is not a source port or literal TryPost feature clone. Provider-specific publishing features become available as PalladiumAI integration adapters/connectors expose typed capabilities. This avoids a second OAuth stack, a second job scheduler, duplicate approval logic, and AGPL source contamination while retaining the useful social-operations product model.
