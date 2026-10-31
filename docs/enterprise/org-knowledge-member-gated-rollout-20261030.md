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

## Added original-uploader offboarding guard (30 October)
The earlier candidate read policy was insufficient for an uploader who left
their organisation: the pre-existing permissive `memory_documents_owner_only`
and `memory_chunks_owner_select` would still authorise that owner's records.
The migration now adds **RESTRICTIVE SELECT policies** on both tables. Any
organisation-labelled row requires current membership, regardless of whether
the caller uploaded it; ordinary personal `org_id IS NULL` knowledge is unaffected.
The isolated PostgreSQL harness now checks former-uploader document and chunk
denial, unaffected personal records, and denial to remaining members after
the uploader exits. It does not rewrite or delete existing customer data.

**Offboarding caveat:** This restricts database reads after the policy is
applied; it is not a promise to revoke an already downloaded copy, direct
storage-bucket file ownership access, or custom search RPCs that bypass the current caller's RLS.
Those additional surfaces still need audit before enterprise certification.
No migration was run against Production.

### Derived memory summary offboarding
The candidate now also installs a RESTRICTIVE SELECT policy for existing
`agent_memories` rows with a non-null `org_id`. Without this, the original
uploader could lose direct document/chunk access but retain a searchable
organisation policy summary. The isolated test suite covers previously shared
memory, private organisation memory, and unrelated personal memory for both
revoked contributors and remaining members. The policy does not revoke
direct raw storage access to files the original uploader controls, nor prove
that every elevated search RPC has correct authority checks.


## 30 October storage and mutation hardening addendum (draft only)

**Correction based on fresh 31 October 2026 read-only live inspection:** the
existing `trusted_media_read_scope`, `trusted_media_upload_scope`,
`trusted_media_no_client_replace`, and
`trusted_media_no_client_delete` policies are all **RESTRICTIVE**, not
permissive. PostgreSQL intersects these policies with the Knowledge bucket's
permissive owner-only conditions; the previously claimed cross-bucket OR-bypass
is **not established by the current production policy definitions**. Five
Storage buckets are private. This correction does not replace real signed-in
Storage API testing or broader review of the supported service-role paths.

The candidate migration now adds explicit **RESTRICTIVE owner-prefix**
SELECT/INSERT/UPDATE/DELETE policies on `storage.objects` scoped to the
`knowledge` bucket. A narrowly scoped non-API `private` security-definer
predicate also blocks read/update/delete of indexed organisation source objects
once their original owner loses live membership. Its boolean response never
returns object contents. Unlinked pre-indexing uploads and genuine personal
files remain owner-only. Existing authorised signed URLs may remain valid for
their 120-second lifetime after offboarding; RLS cannot retract existing copies.

The isolated PostgreSQL harness first reproduces the LIVE-SHAPE restrictive
Storage policy combination and demonstrates baseline owner isolation before
the candidate migration. It then applies the draft policies and checks
offboarded-owner denials. A **separate hypothetical drift scenario** makes
the compatibility rules permissive to verify the new Knowledge owner-prefix
guards are defence in depth. That hypothetical does not describe live state.

Legacy memory maintenance paths are also narrowed: reindex, update, delete
and vector-index entry points enforce `user_id` equality, and owner mutation
endpoints no longer report successful deletion after zero affected rows.
Unit tests explicitly check denied cross-owner operations have no vector
side effects.

**Important:** these changes are still only GitHub draft source. The
`knowledge` bucket and `private` helpers in the connected live Supabase
database have not been changed. Security review of the broad cross-bucket
compatibility policies for other buckets remains a separate requirement.
Do not certify Storage isolation against actual users until direct authenticated
Storage API tests have been completed on an isolated preview database.


## 31 October correction/acceptance record
- Read-only connected `pg_policies`: trusted-media compatibility scopes are RESTRICTIVE for all four operations; existing Knowledge owner guards are PERMISSIVE. Do not claim a verified live OR-bypass. No customer object access was attempted.
- `storage.buckets` confirms five private buckets: `cinema-hf-outputs`, `game-foundry`, `knowledge`, `trusted-media`, `website-studio-assets`. This is configuration metadata only; it does not prove end-to-end Storage API isolation.
- A separate future permission and direct Storage API test is required for all buckets, with attention to privileged service-role calls and signed-URL lifetime.


## Gated real two-user Supabase API/Storage acceptance harness

Candidate QA script: `scripts/verification/enterprise-knowledge-api-uat.mjs`.
Running `node scripts/verification/enterprise-knowledge-api-uat.mjs --self-test` requires no credentials or network, and verifies that the guard refuses the known Production project, malformed/identical user identities, malformed Storage paths and an intentionally leaked private document response.

**Real UAT is still BLOCKED:** no separate non-production Supabase project/branch or approved fixture identities currently exist. Real requests are only enabled by `BLACKSTAR_UAT_NONPROD=I_CONFIRM_ISOLATED_TEST_DATABASE`, a distinct 20-character non-Production Supabase project ref and matching HTTPS host. The real test is **read-only** and uses designated synthetic data; no service-role key or customer content is needed.

Operator supplies these environmental values **only in a local secure runner / isolated job, never in the repository or logs**:
- `BLACKSTAR_UAT_NONPROD`, `BLACKSTAR_UAT_PROJECT_REF`, `BLACKSTAR_UAT_URL`, `BLACKSTAR_UAT_ANON_KEY` (isolated project only)
- `BLACKSTAR_UAT_OWNER_JWT`, `BLACKSTAR_UAT_MEMBER_JWT` (genuine distinct signed-in test identities)
- `BLACKSTAR_UAT_ORG_ID`, `BLACKSTAR_UAT_SHARED_DOC_ID`, `BLACKSTAR_UAT_PRIVATE_DOC_ID`, `BLACKSTAR_UAT_SHARED_OBJECT_PATH` (synthetic indexed fixtures, final path owner-prefixed)

Run `node scripts/verification/enterprise-knowledge-api-uat.mjs` only **after** candidate migration is approved and applied to that isolated project and test documents/chunks/source file are indexed, while the test owner and member both belong to the fixture organisation. It checks authenticated document/chunk RLS, member private-denial, successful owner Storage read and member source-file denial; no content is printed or saved. It does **not** yet prove offboarding, user-browser UAT, signed URL expiry or mutation/audit transactions over the network. Those require a separate, explicitly approved disposable fixture execution.


### Staged revocation acceptance phases — QA-only

The read-only two-user API harness additionally supports `BLACKSTAR_UAT_PHASE`:
- `active` (default): current owner can read their own ready shared/private organisation documents and source file; a current member can read only explicitly shared document/chunk rows, not the owner's private document or Storage file.
- `member_revoked`: after a separate authorised operator has removed the member from the synthetic organisation, the original owner retains access but the former member must no longer read shared document or chunk rows.
- `owner_revoked`: after a separate authorised operator removes the original uploader from the synthetic organisation while the test member remains, **both** must lose access to that uploader's organisation documents/chunks, and the original uploader must lose direct authenticated Storage download access to the indexed organisation source.

The two revocation phases refuse to run unless `BLACKSTAR_UAT_REVOKED_CONFIRM=I_CONFIRM_MEMBERSHIP_ALREADY_REVOKED` is supplied. The harness **does not** change organisation membership, upload objects, call privileged RPCs, mint signed URLs or inspect response bodies. Test phases should be run only against individually prepared disposable fixtures in an approved isolated project; don't run a revoked phase with unreconciled identities. The mock-only CI self-test exercises all three phases and injects deliberate Data API and Storage visibility failures to verify denial assertions, but **does not count as real authenticated UAT**. Any later live approval must also cover signed URL expiry and service-role privileged access separately.
