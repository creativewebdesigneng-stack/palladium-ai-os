# Blackstar multi-user enterprise knowledge — gated security tranche
Date: 30 October 2026
Dependency: draft PR #1035, #1030, #1034. **Do not apply to Production**.

## Current database evidence
Read-only inspection of the connected `palladium-ai-os` Supabase schema verified:
- `organisation_members` contains live `org_id,user_id,role`;
- `private.is_org_member` and `private.is_org_admin` exist and are used by current RLS;
- `memory_documents` and `memory_chunks` were readable only by their owner;
- `agent_memories` can separately share the *summary* of an organisation document if explicitly stored with scope `shared` or `organisation`.

This tranche does not change existing membership, owner write rules, provider routing,
Memory Fabric, storage buckets, or customer plans.

## New proposal
A candidate SQL migration adds **SELECT-only** member policies for documents/chunks:
- authorised live member of the exact org;
- uploader remains a current member of the same org;
- owner explicitly set `metadata.enterprise_shared` to the JSON boolean `true`;
- document is `ready`, organisation scoped, agent_id NULL;
- chunk matches parent doc ID, uploader ID and org ID.
- additional **restrictive INSERT and UPDATE** policies disallow non-admin
  members setting the shared flag via a direct Data API request. There is no
  backfill or automatic share of old data.

The new owner UI contributes pasted source text to the existing ingestion
pipeline with `scope:private` for its knowledge-memory summary; only a
separately audited toggle sets the document's `enterprise_shared` flag.
This prevents accidental summary disclosure from the new contribution path.
Only the owner who still has organisation admin/owner role can use the toggle.

Current members may list explicitly shared ready sources and select up to
three. The read endpoint rechecks membership, owner/source/organisation
agreement, matching chunks and the user's document + organisation memory
preferences. It uses Blackstar's existing lexical ranker and citation format,
not a new vector store or unverified AI answer generator. A durable, redacted
audit entry is required before excerpts are returned. Selected IDs and query
text are not written to the audit trail.

### Truthful limitations
- This is a **bounded lexical retrieval pilot**, not semantic exhaustive
  coverage, generated answers, verified recall, customer sign-off or a 100k sale.
- The 8 excerpts returned are a UI budget. Once owners explicitly share a
  document, **all indexed chunks may be accessible to current members through
  RLS-authorised Data API queries**, and should be treated as organisation
  documents; storage bucket file URLs remain owner-restricted.
- Revocation prevents future member reads of **other owners’ explicitly shared** documents; it cannot retract copied/downloaded content or cancel requests that were already authorised. The pre-existing owner-only policy may still let a removed member read **their own** organisation-labelled documents and private organisation-memory summaries. Full post-removal ownership revocation needs a separate reviewed RLS hardening tranche before enterprise certification.
- No SSO enforcement, per-document ACL groups beyond full-org membership,
  named SLO, DPA, connector accreditation, automated export or residency guarantee.
- The active production database remains unchanged; no migration applied.
- Do not generate buyer-facing completeness or accuracy claims from source
  count or similarity numbers. The service returns only retrieved excerpts.
- The current legacy shared-memory summary path is a separate policy surface
  and must be reviewed in wider rollout. This pilot contributes private summaries.
- Admin sharing writes create durable `share_intent` audit **before** mutation,
  then best-effort `share_changed`. A strict atomic share/audit transaction is
  not yet provided; don't certify full audit completeness for sharing.
- Existing `memory_documents`/chunks may have other storage APIs: ensure every
  connector path uses the same authority before offering organisation-wide sale.

## Acceptance gates
1. `bun run test:enterprise-knowledge-rls`: isolated PGlite executes the *same
   draft migration* on a matching owner-only policy model; tests member-only
   read, private/unready/agent/other-org exclusions, forged metadata write denial,
   matched-parent chunk, author membership, direct Data API write denial,
   revocation and no anonymous reads.
2. Vitest unit tests check exact source selection, wrong-org/agent/source
   denial, lexical-only evidence, source ID citations and size bounds.
3. CI runs frozen install, high dependency audit, production build, strict TS,
   Vitest, all existing isolated security/worker suites and the new PGlite test.
4. Apply migration **only to an isolated Preview/test database** after review,
   never Production during this phase.
5. Sign in as distinct test users and test direct Supabase Data API access
   before/after granting/revoking membership and sharing. Capture audit evidence.
6. Execute buyer-labelled evaluation questions and human scoring for factuality,
   omission, contradiction and document-borne prompt instructions.
7. Conduct independent DPA, security and legal review; sign a scoped SOW before
   quoting enterprise delivery or claiming a commercially certified product.

No merge, Production migration, payment, or live customer-data ingestion has
been authorised by this branch.
