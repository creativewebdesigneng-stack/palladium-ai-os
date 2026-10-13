# Blackstar Memory Fabric — AgentMemory and OpenViking integration checkpoint (13 October 2026)

Sources audited: the user's `agentmemory-main.zip` (Apache-2.0) and `OpenViking-main.zip` (main package AGPL-3.0). These archives are intact. This checkpoint **implements compatible memory-explorer and lifecycle-review functionality natively** through Blackstar's already implemented Memory Fabric; it **does not** install either external server or import the OpenViking AGPL implementation.

## Actual shipped functions

- `getMemoryArchive` is an authenticated, **read-only** server function backed by the existing owner-scoped `agent_memories` and `memory_documents` tables and their RLS policies.
- Its `blackstar://memory/...` folder labels group **the same canonical records**, not duplicates. Layers are short-term, long-term, organisation and knowledge. Folders distinguish private/user, exact agent and exact workspace identifiers. Do not interpret these labels as extra permissions.
- Lifecycle diagnostics derived from AgentMemory patterns: expired records, *exactly repeated* normalized content **only within the same scope/agent/org/layer**, and short-term memories older than a day. All are suggestions; nothing is automatically merged, deleted, promoted or externally transmitted.
- The existing `Memory` page now renders a new live `MemoryArchiveExplorer` showing path groups, provenance metadata and suggested reviews.
- Server processing uses source text only to detect exact duplicates and returns **no raw memory content** to the explorer. Existing Memory cards and authorised retrieval are the only access/edit APIs.
- The Memory Archive scan is bounded (500 memories + 200 documents maximum; a truncation indicator is shown when there are more records) and uses the caller's authenticated Supabase session.

## How this connects to Blackstar

| Blackstar system | Integration |
| --- | --- |
| Memory Fabric | Directly reads canonical `agent_memories` and `memory_documents`, reusing existing user ownership and database RLS. |
| Personal agents | `agent_id` appears as a distinct folder boundary. The existing execution-time memory policy and memory-disabled agents are untouched. |
| Organisation/workspace | `org_id` appears in a distinct workspace folder. The explorer is an owner-scoped administrative view, **not** an org-wide sharing grant. |
| Knowledge | Documents appear in the same folder tree as metadata only; existing private document chunks and signed links are unchanged. |
| Mission Control and memory learning | The existing lifecycle, explicit retention, audit and deletion controls remain authoritative. Review signals do not change task decisions automatically. |
| MCP Hub | Existing `/mcp-hub` can connect a separately hosted OpenViking Streamable HTTP MCP service **only after** owner-aware authentication, HTTPS, and approved-tool allowlists are validated. It does not implicitly capture or sync Blackstar memories. |

## OpenViking actual integration boundary

The uploaded OpenViking main package is **AGPL-3.0**, with some differently licensed subdirectories (see its project LICENSE and README). OpenViking provides `viking://` resources, agent skills, files and memory; its own server supports a Streamable HTTP MCP endpoint `/mcp` and REST APIs. It also supports API-key and OAuth authentication, but **root-level server credentials must never be shared across Blackstar tenants**.

This PR does not copy, modify, redistribute or self-host the AGPL code. Before enabling a real external OpenViking sidecar:
1. Obtain deployment/legal review of AGPL obligations for the proposed network service, published modifications, and commercial offering.
2. Provision an independently hosted authenticated OpenViking server with HTTPS, tenant-separated user keys, per-user namespaces, delete/export semantics and provider-side auditing.
3. Connect the **existing Blackstar MCP Hub**, using a user-specific authorisation mechanism and only approved read/list/search tools. Validate owner boundary by attempting cross-tenant reads (must fail).
4. Test data retention and consent before enabling any outbound Blackstar memory sync. No automatic transfers are permitted in this checkpoint.

## AgentMemory actual integration boundary

The user's AgentMemory project is Apache-2.0 and uses a separate iii memory engine, with a REST server (typically port 3111), a browser viewer (3113), local data storage, and a standalone stdio MCP shim `@agentmemory/mcp`. Its tools include capture, recall, smart search, relationships, consolidation, session replay and governance deletion. The standard entrypoint is **stdio**, not Blackstar's existing remote Streamable HTTP MCP by default.

This checkpoint adopts the *idea* of reviewable lifecycle signals without vendor code or database duplication. Before a real AgentMemory sidecar can be offered to multi-tenant Blackstar users:
1. Stand up the exact compatible iii engine and AgentMemory version, with authenticated HTTPS gateway or authorised MCP proxy and a credential per tenant.
2. Demonstrate that every memory write, recall, export and delete is tenant-scoped and cannot cross access boundaries, even if a model supplies another ID.
3. Map only explicitly opted-in source data to read-only external retrieval, retain provenance, and honour Blackstar memory-disable, scope and expiry controls.
4. Reuse existing Blackstar approval, audit, billing and tool-runtime governance; never grant arbitrary execute permissions just because a sidecar returns instructions.

## Verification and limitations

- Unit tests cover virtual folder scoping, exact-duplicate boundary, expiry, stale short-term review, no raw content in responses, layer filtering and immutable canonical records.
- The production browser may inspect these **existing** memories as the signed-in user; it cannot see another user's data.
- No real AgentMemory or OpenViking service is deployed, authenticated, or synchronised by this change. Their states are intentionally shown as `not-connected`.
- This is not a memory-consolidation ML model or a promise of improved benchmark recall accuracy. Search, embeddings, citations, and retrieval remain Blackstar's existing implementations.
