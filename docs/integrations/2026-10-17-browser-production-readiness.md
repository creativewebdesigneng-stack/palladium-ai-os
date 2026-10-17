# Browser production readiness — 17 October 2026

## Verified deployment boundary

The authenticated production Browser Preview reports **Not configured** and
refuses browser and shopping research actions. Browser Use reports **Needs env**.
Supabase contains zero recorded browser sessions; no live browser execution is
certified by this checkpoint.

Vercel environment **names and targets only** were inspected without decrypting
values. Production has no `PLAYWRIGHT_BROWSER_ENDPOINT`,
`PLAYWRIGHT_BROWSER_TOKEN`, `BROWSER_AGENT_PROVIDER`, or Browser Use API settings.
The existing Windows Playwright endpoint/token and browser-selection settings
are confined to preview branch
`integration/browser-worker-live-preview-20261013`. Those settings are marked
development-only; this checkpoint does not copy them into production.

The worker's current availability cannot be inferred from those preview settings.
No production endpoint exists to probe through Blackstar's authenticated adapter.

## Readiness corrections

The existing provider registry now requires the Playwright endpoint **and** its
private token, and its configured flag uses the same validated endpoint as the
runtime. Missing tokens and invalid endpoints cannot be advertised as configured.

The Browserbase runner accepts only HTTPS endpoints without URL credentials,
query strings or fragments. Valid HTTPS runner base paths remain supported.
Malformed/insecure settings fail before any request can transmit credentials.
Existing manual redirect handling, provider selection, health probes, domain
allowlists, approvals and worker contracts remain in place.

Focused regressions cover missing Playwright tokens, invalid URL readiness,
Browserbase rejection without network traffic, HTTPS base-path handling and
whitespace-only credentials. Full CI and live release receipts are recorded in
the corresponding pull request and issue #982.

## Persistent-session transport correction

The persistent `browser_task` path now shares the ordinary adapter's validated
provider configuration instead of reconstructing credentials independently.
Both session creation (which can carry saved cookies) and subsequent actions
refuse redirects and use bounded 30/60-second request signals. Ambiguous mutating
failures are not retried. Initial and exported profile state is filtered through
the existing domain-scoped storage sanitizer. Invalid session receipts, missing
navigation/extraction evidence and invalid action envelopes fail explicitly;
provider error bodies are not returned as user-visible errors.

Regression tests cover redirects, timeout non-replay, state filtering, malformed
receipts and both provider authentication formats. These tests do not establish
a live production worker connection or install Browser Use/OpenHands.

## Requirements before production execution can be certified

1. An approved production host running the existing `browser-worker` Docker
   image with Chromium, isolated sessions and restricted network egress.
2. A stable HTTPS endpoint and matching private bearer credentials, configured
   securely on the worker and Vercel Production. Credentials stay server-side.
3. `BROWSER_AGENT_PROVIDER=playwright` and simulation disabled in production.
4. The existing authenticated health check must verify the actual worker service
   and `browserReady: true`.
5. The existing smoke acceptance must pass real navigation/extraction, private
   network rejection, isolated session creation and cleanup. An owner-authorised
   Blackstar agent browser task must then save task, tool and audit evidence.

The existing Render blueprint can incur hosting charges. No new paid service,
tunnel exposure, credential grant, CAPTCHA bypass or simulated substitute was
created. Local Windows acceptance alone is not production acceptance.

The external Python Browser Use runtime remains a separate undeployed adapter
prerequisite behind the same governance boundary. Setting metadata variables
does not install it or establish an executable integration.

## Related verified work

PRs #993–#996 completed audited stale-run recovery, connected model choices,
existing-agent model switching, accurate cancellation history and memory recall
status. Groq 120B/20B inference passed signed-in acceptance. Semantic memory's
latest production check still reports embedding quota/billing exhaustion;
keyword fallback works. These receipts do not certify external browser workers,
OpenViking, AgentMemory or all business capabilities. Current detailed receipts
and remaining blockers are maintained in issue #982.
