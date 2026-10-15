# Trust Fabric schema recovery

The four existing Trust Fabric collections were absent from production. The recovery reuses their original table and RPC contracts, with current authorization instead of retired public helpers.

## Security and compatibility

- All four tables have RLS and explicit privileges. Anonymous access and authenticated TRUNCATE are denied. Reads and mutations remain owner-scoped, including passport visibility through identities. Organisation membership alone grants no access to another owner's records.
- Identity writes must match an owned agent, its canonical identifier and its organisation. Owners cannot assert verified/privileged trust tiers. Passport ownership follows the identity. Delegations and message envelopes require both agents to be owned by the caller in the same organisation; non-null organisations also require the existing private membership helper.
- The existing delegation resolver uses SECURITY INVOKER, owner predicates and RLS. No new public SECURITY DEFINER helper or retired public authorization function is introduced.
- The migration refuses to proceed if any of the four tables already exists, preventing an unreviewed partial-schema overwrite. It preserves the existing metadata backfill for agents, with standard/revoked identity state and guarded passports with empty capability/provider/tool scopes. It creates no delegation grant, message, signing key, approval or tool permission.
- Existing passport, delegation and message mutation handlers now require started and completion audit entries. Failure of the initial audit stops all writes. Completion failure on a newly created grant/envelope attempts a verified suspension/rejection and reports failure; inability to verify compensation is reported explicitly. These separate database/audit requests are not an atomic transaction. Passport metadata can persist after completion-audit failure, but does not grant tools or create delegation authority.

## Verification

The pinned development-only PGlite 0.5.9 dependency runs real isolated Postgres/RLS tests through `npm run test:trust-fabric`, now also in the existing Backend Check workflow. Forty-three checks cover owner isolation (including shared organisations), anonymous read/write denial, TRUNCATE denial, reassignment, self-asserted privilege, cross-owner/cross-organisation grants and envelopes, expiry and invoker-mode resolution. Fixtures never run against production.

Eight new handler tests cover required audit failure before writes, payload exclusion and compensation after completion failure. The complete application suite passed 2,606 tests across 628 files; TypeScript, build and high-severity dependency audit passed locally. Exact CI, migration application, advisors and live UI evidence are recorded in the PR.

## Audit credential remains an external prerequisite

Both production audit credentials are sensitive Vercel variables managed by integration `icfg_7JyiX7jdTiYPofli24hgwd8W`. The connected Vercel API cannot access that integration configuration, and the Supabase connector exposes publishable keys only. No secret was fabricated, retrieved through database internals, printed, or substituted with a publishable key. Required-audit failures must remain blocking until a valid server credential is securely configured. The final scientific import and live configuration mutations cannot be certified until then.

OpenViking and AgentMemory still require their reviewed authenticated services and tenant-isolation evidence. The external Browser Use Python provider remains unconnected. This recovery makes existing Trust Fabric schema usable; it does not certify those external providers.
