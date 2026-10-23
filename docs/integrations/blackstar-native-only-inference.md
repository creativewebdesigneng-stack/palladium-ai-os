# Blackstar-only inference acceptance

The existing model gateway supports an opt-in deployment policy, `BLACKSTAR_NATIVE_ONLY=true`.
It restricts gateway inference to provider `compatible` and the exact `BLACKSTAR_NATIVE_MODEL`.
It does not train a model, certify intelligence, prove endpoint ownership or restrict every
independent media/provider integration elsewhere in Blackstar.

## Private configuration for an isolated Preview

- `BLACKSTAR_NATIVE_ONLY=true`: enforce the restriction across normal, pinned, streaming
  and direct base-gateway calls. Leave unset on shared deployments that require other providers.
- `OPENAI_COMPATIBLE_BASE_URL`: operator-verified Blackstar-controlled HTTP(S) inference base
  ending in the serving API path (typically `/v1`). Use HTTPS for remote infrastructure.
  URL credentials, query strings and fragments are refused; redirects are refused.
- `BLACKSTAR_NATIVE_MODEL`: exact model identifier served by that endpoint.
- `OPENAI_COMPATIBLE_API_KEY`: privately configure when the serving endpoint requires it.
  Never expose values to client code, repository files or reports.

No provider keys are deleted or copied by enabling this policy. The default provider becomes
compatible, even if its configuration is missing; inference then fails explicitly instead
of selecting a hosted provider. Existing agents explicitly set to other providers must be
edited through the existing agent editor to use the compatible route and pinned model.
Existing per-run provider restrictions still apply. There is no automatic migration of agents.

`BLACKSTAR_NATIVE_PRIMARY` alone remains a preference with fallback. The new strict policy
bypasses remembered routes, alternate providers/models, legacy Groq bootstrap and gateway
web-search rescue. Ordinary authorised web research tools remain available. Same-endpoint
transport retries remain bounded by existing retry settings. Pinned external judge calls
are also blocked in this deployment; use the separately authorised certification environment
for independent comparisons, without weakening its evaluator checks.

## Evidence required before claiming independence

Use an approved isolated database and authenticated test owner. Confirm server/network egress
and serving logs demonstrate that the configured endpoint actually serves the pinned weights
and does not proxy to an external model API. A compatible URL or renamed model is not proof.

Run a fresh agent task with normal approvals and restricted tools. Capture exact commit,
model identity, model/tool call records, approval decisions, final task and audit IDs. Test
normal and streaming inference, a real tool call, a rejected approval, and unavailable model
service. On service failure, verify no external model traffic and no fabricated completion.
For browser acceptance, configure the existing Playwright endpoint/token for the same Preview
and retain navigation/extraction evidence for https://httpbingo.org/html.

The automated suite uses HTTP fixtures, not live weights or GPU inference. Current live
acceptance remains blocked by unconfirmed isolated test access and native serving configuration.
The policy is implemented but has not been enabled in Vercel or Production by this change.
