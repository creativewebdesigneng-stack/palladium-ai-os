# Gemini streaming model availability recovery

The Supabase application-key repair and production redeployment restored required audit writes. Both authenticated importers completed: 177 scientific references and one Diagram Design guide, all disabled, with scanning and audit evidence. The existing no-tool QA agent then reached Google, but Gemini 2.5 Flash returned model unavailable.

The wizard and Agent Builder had introduced a separate 2.5 Flash default while the existing server gateway and AI preferences used 3.6 Flash. Streaming also bypassed the gateway's existing same-provider model candidates. Google currently restricts access to 2.5 models to projects that actively used them previously; this is consistent with the observed 404, not proof of the project's exact entitlement. Official source: https://ai.google.dev/gemini-api/docs/deprecations (checked 17 October 2026).

## Existing architecture repair

- New wizard, legacy display-label recovery, writer defaults and Agent Builder selections now use the existing 3.6 Flash choice. Explicitly saved model IDs are preserved.
- Gemini streaming uses the gateway's existing candidate list only after a provider 404 and before any output. Available explicit models are not changed. There is no new cross-provider fallback, credential store or model registry.
- Authentication, quota, cancellation, other transport errors and partial text/tool emissions do not trigger this new streaming fallback. Native transport retries remain as before.
- The final stream event reports the actual provider/model, which the existing completion writer persists. Exact-model evaluation uses the existing pinned path without fallback.

Regression tests cover the observed 404 recovery, actual model/usage identity, same-provider/tool preservation, rejected statuses, partial emissions, exhausted candidates, available explicit models and pinned evaluation failures. Full build, TypeScript, application tests and existing access-control/worker CI gates are required before merge. Exact deployment and authenticated runtime results are recorded on the pull request; mocked responses are not live certification.

## Prior live import evidence

Production redeployment dpl_Cpp4FamPvbGCjQFN21RmEfMkHE4g serves tested commit fd2bcaaeb9d91f2c76dee2ceff7c10b09665084e. Scientific importer: 45 audited completed batches, 177 processed, 1 inserted, 176 updated, 0 skipped; verdicts 121 ok, 7 warning, 49 dangerous. Diagram Design: one ok record and audited completion. All 178 records are disabled with no declared tool/script dependencies. QA task ec5c5b78-e685-4ebc-9eb8-68b43906febb recorded the Gemini model failure; issue #982 remains open until a successful real run is verified.
