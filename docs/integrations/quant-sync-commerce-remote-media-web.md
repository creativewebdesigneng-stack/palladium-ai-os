# Quant, sync, commerce, remote developer, media timeline and web-change integration

This batch integrates useful concepts from seven audited repositories into PalladiumAI without introducing parallel authentication, agent runtimes, file platforms, commerce admin systems or web runtimes.

## Architecture decisions

### PySystemTrade + Awesome Systematic Trading → Quant Studio

PalladiumAI adds a native Quant Studio for systematic-strategy definitions, risk targets and deterministic backtesting from user-supplied historical returns. It does not fabricate market data and is research-only by default. Any future live broker action must pass through PalladiumAI's existing Integrations, Agent Runtime, permissions, approvals and audit boundaries.

PySystemTrade is GPLv3. Its source is not copied into PalladiumAI. The implementation in this repository is native PalladiumAI code based on general systematic-trading concepts. The Awesome Systematic Trading repository is used only as taxonomy/reference inspiration; its resource corpus is not imported.

### WebClaw → existing Web Intelligence

WebClaw is AGPLv3. No WebClaw source is copied. PalladiumAI's existing Firecrawl/Crawlee Web Intelligence workspace is extended with native snapshot and change-detection records. Snapshots operate only on completed PalladiumAI scrape/crawl jobs, reuse the existing public-HTTP/SSRF target policy, store SHA-256 content hashes and bounded excerpts, and remain owner scoped with RLS.

### Syncthing → Sync Center + existing Files/Integrations

Syncthing is MPL-2.0. PalladiumAI does not install a second file browser, account model or storage authority. Sync Center stores owner-scoped path mappings and references to existing PalladiumAI Integrations/MCP connections. Provider credentials are not stored in sync records.

### Medusa → Commerce Studio + existing business systems

Medusa's open-source areas are MIT while separately licensed Enterprise material exists. PalladiumAI does not import Medusa Enterprise material and does not clone Medusa's admin/auth/backend stack. Commerce Studio records workspace/provider references and asks PalladiumAI's provider-neutral integration runtime for live capabilities. Shopify, CRM, analytics and payment surfaces remain existing PalladiumAI systems. A saved Medusa-compatible workspace does not imply that a live Medusa server exists.

### Happy → existing Developer Workspace

Happy is MIT. PalladiumAI adopts the remote-session concept as connection metadata inside Developer Workspace. PalladiumAI remains authoritative for Git, terminal execution, deployments, Agent Runtime, approvals and audit. No Codex-specific runtime is introduced by this integration.

### Rocket → existing Media Studio

Rocket is Zlib licensed. PalladiumAI adds native timeline tracks/keyframes with bounded timestamps and step/linear/smooth interpolation metadata directly to Media Studio. This is not a second media application and can optionally associate tracks with existing media edit jobs.

## Security and ownership

All new persistent tables use owner-scoped RLS. Connection fields are references only and server validation rejects obvious raw token/password/API-key assignments. Secrets remain in PalladiumAI's existing encrypted integration/provider systems. Web snapshots reuse the existing public-target validation. Timeline writes validate track ownership. Quant runs validate strategy ownership and persist the exact deterministic result generated from supplied observations.

## New native surfaces

- Quant Studio: `/quant-studio`
- Commerce Studio: `/commerce-studio`
- Sync Center: `/sync-center`
- Remote developer sessions: existing `/developer-workspace`
- Media timeline/keyframes: existing `/media-studio`
- Web snapshots/change tracking: existing `/web-intelligence`

The batch is intentionally additive to current PalladiumAI systems rather than a vendor-code import.
