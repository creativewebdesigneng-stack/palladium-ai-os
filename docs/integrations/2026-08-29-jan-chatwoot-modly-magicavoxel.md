# Jan, Chatwoot, Modly and MagicaVoxel audit — 2026-08-29

## Sources audited

- `jan-main(1).zip` — Jan desktop/local AI application. Apache-2.0.
- `chatwoot-develop(1).zip` — Chatwoot customer-support platform. Core is MIT; separately licensed enterprise material is excluded.
- `modly-main(1).zip` — Modly local image-to-3D application/runtime. MIT; attribution requested by the project (`Based on Modly by Lightning Pixel`).
- `ephtracy.github.io-0.99.7.tar(1).gz` and `ephtracy.github.io-0.99.7(1).zip` — duplicate website/source distributions.
- MagicaVoxel 0.99.7.1 and duplicated 0.99.7.2 Windows distributions — vendor binaries/reference material, not imported into the web application.

## Consolidation decisions

### Jan

Jan overlaps PalladiumAI's Model Hub, Agent Runtime, assistants, MCP and local/OpenAI-compatible provider support. Jan exposes an OpenAI-compatible local server, so PalladiumAI does **not** embed Jan's Electron/Rust/desktop application or create a second model gateway.

Jan is supported through PalladiumAI's existing `compatible` model-provider lane:

- configure `OPENAI_COMPATIBLE_BASE_URL` to the Jan server's OpenAI-compatible `/v1` base (Jan commonly serves locally on port 1337),
- optionally configure `OPENAI_COMPATIBLE_API_KEY` if the endpoint is protected,
- assign agents to the existing `compatible` provider and the model name exposed by Jan.

The Models runtime now labels this lane as Jan-supported. Existing provider failover, usage telemetry, tool calling, Harness controls, MCP, memory and agent assignments remain authoritative.

### Chatwoot

PalladiumAI already had a live Customer Support Centre backed by `support_tickets` and `support_messages`. Creating another conversation/message subsystem would duplicate functionality, so the integration extends the existing support records instead.

Added missing Chatwoot-style capabilities:

- channel inbox metadata for web, email, chat, phone, WhatsApp, Facebook, Instagram, Telegram, Line, SMS and API channels,
- optional CRM-contact and external-thread references on canonical tickets,
- ticket labels, team routing, unread count and metadata,
- private-note and delivery metadata on canonical support messages,
- help-centre articles,
- canned responses,
- live support capability discovery from PalladiumAI's existing provider-neutral Integrations runtime.

The existing `/support` page stays canonical and is composed with an omnichannel extensions panel. Provider credentials are never stored in the support tables; external sends/actions continue through Integrations, Harness policy and approval controls. Existing CRM and WhatsApp CRM remain sources of truth for contacts and WhatsApp-specific operations.

Chatwoot Enterprise source is not copied.

### Modly

Modly adds a genuinely new capability: image-to-3D mesh generation. PalladiumAI adds a native **3D Studio** rather than importing Modly's Electron UI, Python environment, model downloads or extension manager.

The native adapter:

- uses a separately deployed Modly-compatible worker configured with `MODLY_API_URL` and optional `MODLY_API_TOKEN`,
- submits the source-derived `/workflow-runs/from-image` workflow contract,
- persists real worker job IDs/status/output URLs,
- never fabricates completed 3D assets,
- accepts GLB, glTF, OBJ, PLY, STL and VOX output formats,
- blocks local/private source URLs at the worker boundary,
- exposes a bounded `three_d_studio` agent tool through the existing PalladiumAI tool catalogue, Harness and `tool_executions` audit path.

VOX output is intentionally complementary to the already-merged native Voxel Studio rather than a second voxel implementation.

### MagicaVoxel / ephtracy archives

The duplicate ephtracy archives and duplicate MagicaVoxel 0.99.7.2 distributions are treated as one source family. PalladiumAI already merged the useful MagicaVoxel capability in PR #170: bounded VOX creation/inspection/merge and VOX-to-OBJ export in the native `voxel_studio` agent tool.

No MagicaVoxel Windows executables, duplicate website files or ambiguous binary-distribution licensing material are copied into PalladiumAI.

## Reused PalladiumAI systems

- authentication and owner-scoped Supabase RLS
- existing Customer Support Centre and canonical ticket/message records
- CRM and WhatsApp CRM
- Integrations and provider-neutral connected-service runtime
- Agent Runtime / Harness / approvals / `tool_executions`
- Model Gateway and OpenAI-compatible provider lane
- MCP infrastructure
- Voxel Studio
- existing audit subsystem

## New persistent data

Only data not already represented by PalladiumAI is added: support inbox configuration, help articles, canned responses and 3D generation jobs. Existing support tickets/messages are extended in place.
