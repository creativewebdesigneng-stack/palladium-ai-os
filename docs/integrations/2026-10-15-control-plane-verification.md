# Control Plane verification and remaining schema blocker

## Verified production findings

The authenticated Control Plane displayed zero identities, passports, delegations and A2A messages even though its four corresponding tables were absent from the active production Supabase project. A read-only information-schema query returned no columns for `agent_identities`, `agent_passports`, `agent_delegation_grants` or `agent_a2a_messages`. The six other queried tables exist.

The original handler ignored each Supabase error and replaced missing data with an empty array. Its passport query also ordered by `created_at`; the repository's existing passport schema defines `issued_at` instead.

## Changes through the existing Control Plane

- Independently verify every collection; database or transport failure yields unavailable source metadata and null statistics, never a certified zero. Keep successful collections visible when another fails.
- Explicit owner predicates on personal records, including an owner-filtered inner identity join for passports. The shared active-tool catalogue remains a catalogue rather than a user-owned collection.
- Bound every query with a one-record truncation sentinel. The UI identifies snapshot counts, limits reached and collection failures. No account-wide completeness or current provider-health claim is made.
- Order passports by their existing `issued_at` column. Exclude full task errors, approval titles, tool-domain scopes, spend caps, passport capability bodies and A2A payloads from these overview reads. Strip passport join metadata from the response.
- Exclude expired or malformed-expiry delegations/messages from active counts. Count only explicitly enabled tool grants.

## Why existing Trust Fabric migrations were not replayed unchanged

`20260904012000_blackstar_trust_fabric.sql` depends on `public.is_org_member`, `public.org_admin` and `public.can_access`. Those functions are absent from production; the current membership/admin helpers are in `private`. The old migration also creates privileged public helper functions and backfills identities/passports for existing agents. Its policies and backfill need a compatibility and security review before restoration. This checkpoint does not restore retired authorization helpers, introduce permissive policies, backfill trust assertions or execute an unreviewed migration.

The existing A2A schema and subsequent organisation-scope fix also need to be restored together with that reviewed dependency chain. No database mutation was made in this checkpoint. The required-audit credential repair and final scientific import remain deferred; external OpenViking, AgentMemory and Browser Use service requirements remain unresolved.

## Verification

Focused tests cover all ten source failures, rejected transport, owner filters, passport ordering/join projection, bounded truncation and expiry handling. Full regression, TypeScript, build, exact-head CI, deployment and authenticated UI results are recorded in the PR.
