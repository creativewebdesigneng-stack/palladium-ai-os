# Remaining archive audit and native integration — 15 October 2026

The credential repair and final scientific import are deferred at the owner's request. The scientific and Diagram Design audit requirements remain enforced. No external service receives Blackstar records from this change.

## Uploaded source evidence

The five remaining original ZIPs were reopened directly and inspected without installing or executing their contents.

| Archive | Entries | SHA-256 | Declaration / role |
| --- | ---: | --- | --- |
| OpenViking-main.zip | 5821 | `042a138a6093fabf83f211b200e79c10bb345b410f226f3a1e9c8ceb823fdcf5` | Main LICENSE declares AGPL-3.0; directory-scoped retrieval and layered context concepts |
| agentmemory-main.zip | 1020 | `3b9163466a3f4d97e7725e416bd8742643e938d343a809deac27be0a5a056954` | Apache-2.0; lifecycle review, recall and separate memory engine |
| browser-use-main(2).zip | 647 | `3a54a6a37442b802283dbb0c8bff94e0b3b539de7ebb1564b995f1c5ffd8ac11` | MIT; Python browser framework and optional services |
| awesome-harness-engineering-main (1).zip | 15 | `fbd96049b6cc314822a6f33ab05a80675db58a340fcfa6977c268074da4ab202` | CC0; extended bibliography, planning and verification templates |
| awesome-harness-engineering-main.zip | 12 | `354eb90959c41f0d9145ef0df60a623a4b222796fcd4cc54e98b975fed040799` | CC0; compact taxonomy/reference collection |

## Changes through existing systems

- **OpenViking concepts:** existing Memory Archive folders are now selectable. Metadata search filters titles, paths, categories, layers and scopes before any full memory body is opened. No OpenViking implementation is copied, no automatic summaries are generated, and no semantic-retrieval performance claim is made.
- **AgentMemory concepts:** existing expiry, duplicate and stale-short-term suggestions can filter the entry list. Duplicate suggestions also distinguish record owners in their boundary key. Canonical memory rows are never changed by navigation or review filtering. Review filtering explicitly covers the existing capped set of 50 suggestions.
- **Bounded navigation:** entry pagination advances in batches of 24 through all metadata already returned by the existing authenticated 500-memory/200-document endpoint. It does not load another tenant, perform unbounded database reads, or fetch raw memory bodies. Invalid record identifiers no longer inflate the indexed-record total; the inspected-input count remains separate.
- **Both harness collections:** their explicit network-boundary and negative-path verification recommendations exposed a truncation gap. The existing harness now rejects scopes over 50 entries before normalization, rejects malformed and credential-bearing scopes, and checks normalized hostnames. A forbidden 51st target cannot disappear before authorization.
- **Browser Use:** Blackstar's existing Playwright worker, domain controls, encrypted profiles and approval runtime remain authoritative. This checkpoint does not install the Python framework or import a user's system Chrome profile.

## Unresolved external-service requirements

- OpenViking: proposed deployment/licensing review, authenticated HTTPS endpoint, tenant-scoped credentials, export/delete contract and cross-tenant rejection tests before connection through the existing MCP Hub.
- AgentMemory: compatible iii engine and authenticated gateway; tenant-specific isolation, opt-in retrieval and provenance. Its README explicitly warns that Redis database indexes do not isolate its live pub/sub viewer events: multiple instances require separate Redis servers/ports, not only different indexes.
- Browser Use Python adapter: an isolated provider deployment behind the existing worker contract, with owner-scoped profiles, request/auth controls, SSRF protection, consent and live acceptance evidence. Browser Use Cloud and paid x402 actions remain unconfigured.
- Harness resources are guidance, not an independently benchmarked replacement runtime. No external benchmark scores are claimed.

## Verification

Focused tests cover folder-boundary matching, case-insensitive metadata search, exclusion of memory bodies, lifecycle filtering without mutation, owner-specific duplicate review, valid indexed counts, oversized domain scopes, malformed scopes, credentials in URLs and subdomain boundaries. Full build, TypeScript, application regression tests and browser-worker policy checks must pass before merge; exact production deployment and live UI results are recorded separately.
