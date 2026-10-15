# External MCP registry recovery — 15 October 2026

## Verified production gap and recovery

The active production Supabase project had no `public.external_mcp_servers` table, despite the existing MCP runtime, AI Hub inventory and connection functions depending on it.

The existing repository migrations were replayed in their original order through the authenticated migration connection:

- `20260827003000_external_mcp_servers.sql`
- `20260902000500_external_mcp_servers.sql`

The recovery migration is version `20261015002013`, named `restore_existing_external_mcp_registry`. It creates the already-designed table and policies; it does not register or contact a server, copy memory, replace credential storage, or grant an agent new tools.

Post-recovery verification confirmed the table exists, contains zero records, has RLS enabled, and has SELECT/INSERT/UPDATE/DELETE policies restricted to the authenticated row owner. UPDATE includes both USING and WITH CHECK. Neither anonymous nor authenticated roles can TRUNCATE the table. Supabase security advisors reported no new finding for this registry; unrelated pre-existing findings were not changed.

## Existing MCP Hub additions

The new read-only overview uses the existing authenticated registry and explicitly filters by user ID. It loads a maximum of 101 records and returns at most 100 metadata rows, with a truncation indicator. It returns counts instead of cached tool bodies and excludes endpoint URLs, auth header names, credential ciphertext and tokens. Database failures are shown as failures, not represented as an empty registry.

The UI distinguishes saved/enabled configuration and historical discovery from actual health. OpenViking, AgentMemory and Browser Use prerequisites remain explicit. It makes no external requests, registers no services and enables no tools.

## External endpoint safeguards

The existing MCP transport now also denies benchmarking/documentation IPv4 blocks, mapped IPv4 in IPv6 hexadecimal form, NAT64, IPv6 site-local/multicast/documentation addresses, and 6to4/Teredo ranges. Invalid DNS answers fail closed. The public-host DNS check still runs before every RPC, and redirects remain rejected.

This does not claim complete DNS-rebinding protection. Production egress controls remain necessary to prevent connection-time access to private networks after DNS resolution.

## Deferred work remains deferred

The rejected privileged audit credential and last scientific reference import were not modified. There is still no external OpenViking or AgentMemory deployment, and no Python Browser Use provider behind the existing browser-worker contract. Their connection and certification requirements from the earlier archive audit still apply.

## Verification

Tests exercise explicit owner scoping, bounded results, exclusion of endpoint/credential/tool-body data, empty-versus-error states, private/mapped/NAT64/special-purpose address rejection, and valid public IPv4/IPv6. Full build, TypeScript and regression results plus exact deployment/live UI verification are recorded in the PR.
