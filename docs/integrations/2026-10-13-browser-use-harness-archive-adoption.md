# Browser Use and Harness Engineering archive integration — 13 October 2026

## Source archives inspected

- `browser-use-main(2).zip`: working Python browser-use automation source, docs, examples, tests and six source skills (`browser-use`, `cloud`, `open-source`, `qa`, `remote-browser`, `x402`). A duplicate `browser-use` skill appears under `browser_use/skills`.
- `awesome-harness-engineering-main (1).zip`: curated references, harness workflow templates (`PLAN.md`, `IMPLEMENT.md`, `HARNESS_CHECKLIST.md`), a README and link checker.
- `awesome-harness-engineering-main.zip`: a different compact taxonomy/reference list, contributed design notes and link CI.
- The harness collections **do not supply executable agent runtime code**, and the external `browser-use` Python framework is not implicitly available just because its files are present in an archive.

## Reuse the Blackstar architecture

Blackstar already has:
- `browser-worker/server.mjs`: isolated Playwright sessions, domain guard, DOM capture, screens, and QA inspection.
- `src/lib/mission/browser-agent.ts`: provider-neutral browser tool contract; explicit development simulation vs verified production.
- `src/lib/runtime/browser-task-tool.server.ts`: bounded agent browser tool, run trace, credential mediation and owner-scoped encrypted profile access.
- `src/lib/runtime/agent-harness.ts`: execution gating, sandbox profiles and bounded sub-agent delegation.
- Existing approvals, Mission Control, audit and automated CI.

This checkpoint **does not add a second browser runtime or override authorisation**. It incorporates useful Browser Use concepts and Harness checklist safeguards into those existing choke-points.

## Implemented improvements

1. **Model-visible DOM privacy:** interactive element links are normalized to public HTTP(S) URLs without credentials, query strings or fragments; password-reset/callback and invitation paths are masked. Form values are never part of the snapshot. Selectors and labels remain available so an agent can locate the element through the existing browser action tool.
2. **Read-only QA control map:** the existing `inspect_qa` worker action now combines its screenshot and error evidence with a capped, sanitized interactive-elements list (and count). It remains within the established browser session/allowed-domain context, and does not grant new actions.
3. **QA diagnostics redaction:** console, page and network error summaries scrub bearer tokens, API keys, passwords and token-bearing URLs before being returned to Blackstar.
4. **Worker SSRF guard:** network safety denies more special-purpose IPv4 blocks (including CGNAT 100.64/10 and 198.18/15), IPv4-mapped IPv6/NAT64 targets, and reserved IPv6. Public DNS is still verified for every request through the existing guard.
5. **Fail-closed harness:** when a tool requests a network domain but its allowed-domains list is empty, `evaluateHarnessPolicy` now denies instead of permitting it. Approval is not treated as permission to bypass an absent grant.
6. **Regression tests:** browser-worker policy, QA observations, DOM snapshots and harness tests cover all new boundaries. The existing CI workflow already checks JS, TS and Playwright worker policy tests.

## Capabilities not claimed or enabled

- We **have not deployed Browser Use Cloud**, authenticated its API, installed the external Python browser-use runtime, configured cloud browser profiles, bypassed CAPTCHA or enabled its x402 USDC paid gateway.
- No new purchases, payment authorisation or autonomous spending capability has been granted.
- The existing browser-worker endpoint must be separately deployed and its production `PLAYWRIGHT_BROWSER_ENDPOINT` and token verified live before claiming actual remote browsing is available.
- All model-generated content extracted from external pages remains untrusted; the QA element list is observational evidence, not a claim that a navigation/click succeeded.
- DNS rebinding is not *fully* solved by pre-request DNS checks; a hardened production network egress/firewall remains necessary to block access to private IP ranges after DNS resolution at connection time.
- Harness resources remain guidance and checklists; their recommendations are not independent proof of reliability, and Blackstar's existing agent harness is the runtime authority.

## Acceptance criteria

- Existing browser worker suite passes; added assertions block private/CGNAT/mapped IPs, credentials and signed links.
- Agent harness tests include the empty-allowlist fail-closed case.
- Full production build, strict TypeScript, tests and Vercel preview READY precede merge.
- Production is considered deployed only when the exact commit SHA is READY on `palladium-ai-os.vercel.app`.
