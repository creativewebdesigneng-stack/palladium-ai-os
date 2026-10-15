# Explicit tool scope for external MCP integrations

The external MCP runtime previously treated an empty or null persisted tool allowlist as unrestricted. Although the disabled-registration form requires a list, legacy or malformed records could still reach discovery and execution. Approval alone must not expand the server's tool grant.

The existing connector now validates persisted scope before DNS, initialization, discovery or execution: 1–200 explicit string names, each nonempty, at most 160 characters, without surrounding whitespace. Invalid scope fails closed. Discovery and AI Hub capability projections retain only exact allowed names; malformed scope no longer exposes cached tools as capabilities. Execution checks the exact requested name and does not truncate it. AI Hub also requires an explicit enabled state before marking external tools available.

Regression checks cover missing/empty/malformed/oversized scope, no DNS/fetch/cache mutation on rejection, approval with an unlisted tool, exact allowed execution, discovery filtering, and AI Hub inventory projection. Fixtures use no external services or credentials.

No server registration, enablement, approval, database migration or external provider call is performed by this change. The final scientific import remains blocked by production audit authentication. OpenViking, AgentMemory and the Python Browser Use provider still require their reviewed authenticated services and isolation evidence.
