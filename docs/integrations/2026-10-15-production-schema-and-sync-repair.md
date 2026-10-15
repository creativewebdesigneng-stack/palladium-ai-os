# Production connector schema and compliance sync repair

The live diagnostic found absent `integrations`, `integration_credentials`, `dashboard_widgets` and `platform_settings` tables although current application handlers depend on them. The database itself reported ACTIVE_HEALTHY, 20/60 connections, no waiting locks, long transactions or recorded deadlocks, and RLS on all 229 then-existing public tables. Missing schema, rejected audit credentials and failed application jobs must not be described as a general database outage.

## Recovery

Recovery reuses the original connector, encrypted credential, widget and settings contracts, including richer OAuth fields and owner/provider uniqueness. It refuses partial existing state. Connection metadata is owner-only, with organisation membership validated on writes; sharing an organisation does not reveal another owner's OAuth configuration. Credentials and platform settings are server-only, with all anonymous/authenticated privileges revoked. Every table has RLS and authenticated TRUNCATE is denied. The only seed is the original disabled announcement; no connections, credentials, widgets, grants or historical data are fabricated.

Supabase applied `20261015213634_restore_connector_dashboard_settings` and `20261015213645_tune_connector_and_trust_indexes`. Repository filenames match the actual recorded versions. Live verification confirms all four tables, intended grants, zero unsafe UPDATE policies, zero connection/credential/widget rows, four covering indexes, removal of the redundant MCP index and retention of the original uniqueness constraint.

Performance advisors now report only unused-index information: the four missing foreign-key indexes, four per-row auth policy warnings and duplicate-index warning are resolved. Unused indexes are retained because a young deployment's statistics do not justify removing access-control and foreign-key support indexes. Security WARN findings are unchanged: four existing authenticated Marketplace SECURITY DEFINER RPCs and disabled leaked-password protection. Those RPCs retain authentication/role or owner checks, empty search paths and no anonymous EXECUTE. Two additional informational no-policy findings are expected for the restored server-only credential/settings tables; ordinary users have no table privileges.

## Compliance sync

Repeated authoritative content, a source reverting to a previous version, or concurrent insertion previously raised a unique-constraint error. Version persistence now uses INSERT ON CONFLICT DO NOTHING through the existing Supabase client, verifies the exact existing regulation/hash pair on conflict, and preserves immutable snapshot metadata. Actual creation counts distinguish insertion from reuse. Permission/storage failures remain failures. This does not claim the entire multi-request sync is transactional or that concurrent change-event records are deduplicated.

The deployed compliance function v4 was confirmed identical to main before changing it. The patch adds a relative helper and preserves the existing scheduler authentication and JWT setting. Production function deployment and exact code verification are recorded in the PR after CI.

## Checks and remaining work

- Build, TypeScript and all 2,630 application tests passed (629 files).
- `npm run test:connector-recovery` passed 63 isolated real Postgres authorization checks; included in Backend Check CI. Tests never connect to production.
- Five compliance helper tests cover insertion, immutable reuse and fail-closed errors.
- Production audit credentials remain unresolved. Restoring schema does not supply or rotate a secret and does not certify OAuth or imports.
- A retained background HTTP response records a timeout during DNS resolution at 16:30 UTC. Runtime dispatcher 503 responses have multiple possible sources; no unsafe POST retries, hardcoded IPs or authentication bypass were introduced. End-to-end worker certification remains outstanding.
- Leaked-password protection needs the project's Auth configuration and an eligible plan; the connected tools do not expose that setting. No paid upgrade was performed.
