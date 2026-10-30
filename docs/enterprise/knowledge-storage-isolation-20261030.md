# Enterprise Knowledge — direct Storage API isolation gate

**Status:** draft only, not applied to Production. The target is the existing
Supabase `storage.objects` table, specifically bucket `knowledge`.
Depends on draft #1036 and its existing document/chunk/agent-memory offboarding
policies; this commit is a security supplement, not a second Knowledge system.

## Verified in read-only connected Supabase inspection, 30 October 2026
- Policies `trusted_media_read_scope`, `trusted_media_upload_scope`,
  `trusted_media_no_client_delete`, and
  `trusted_media_no_client_replace` have permissive rules for
  `bucket_id <> 'trusted-media'`. These permit operations in other buckets
  unless a RESTRICTIVE policy also constrains them; owner-only permissive
  policies are not enough.
- Knowledge ownership convention in current code is the first storage path
  component: `<user-uuid>/...`.
- Public `search_memory_chunks` and `search_agent_memories` RPCs are
  `SECURITY INVOKER`, not SECURITY DEFINER, and select underlying RLS tables.
  They do not independently bypass document/chunk/agent-memory RLS.
- The inspected project currently returned zero knowledge documents and zero
  storage bucket records in a read-only SQL count. This is **not** confirmation
  of Vercel's runtime project configuration, customer permission behaviour or
  that uploads are working. Confirm project mapping before any migration.

## Narrow defensive migration (not installed)
Add **four RESTRICTIVE** policies covering SELECT, INSERT, UPDATE and DELETE
for `storage.objects` when `bucket_id='knowledge'`. No change to other
buckets or existing user-scoped upload paths. A private, authenticated-only
database helper checks the real storage object by ID, the caller's own path,
the linked document's owner, and *live* organisation membership. It reads
privileged metadata but never exposes content. Its `EXECUTE` is revoked from
`PUBLIC` and granted to `authenticated`, and the function is outside the
exposed `public` schema.

Unindexed uploads may remain readable to their own uploader for **up to one
hour** for the existing upload -> index pipeline. Older unlinked orphan files
become unavailable. Real upload acceptance must test this expiry and ingestion
failure recovery; a wholly separate storage bucket cannot be assumed to exist.

## Unresolved security limitations
- Pre-issued signed URLs remain usable until expiry. Short TTL and active
  revocation checks remain necessary.
- Protecting `knowledge` does not remediate broad permissive policies on
  other buckets. Their potential exposure needs a separate all-bucket
  security review, with no indiscriminate rewrite of marketplace/studio paths.
- A privileged service-role backend could bypass these table/storage RLS
  gates. Audit every elevated storage/RPC path before production release.
- An unlinked object newer than one hour uses a deliberately bounded
  upload grace period and can still be owner-read. No unbounded orphan access.
- Live no-bucket/zero-doc observations are not a valid customer data test.
- Isolated PGlite fixtures cannot prove real Supabase Storage API behaviour,
  owner_id metadata, presigned URL issuance or environment routing.
- No new SSO, customer consent, paid resource, live audit or real buyer UAT.

## Certification checklist
- Run `bun run test:enterprise-knowledge-storage-rls` against the *exact*
  candidate migration SQL using PGlite. Include a permissive legacy
  non-media policy to demonstrate the restriction wins; test cross-user
  read/write/delete, cross-organisation, prior-owner, own personal file,
  orphan upload TTL and preservation of unrelated buckets.
- Full GitHub CI: frozen install, high audit, build, strict TypeScript,
  Vitest, existing backend isolated suites and storage suite.
- Deploy exact green commit to Vercel Preview only.
- Before applying database policies: independently create a non-production
  Supabase test branch with clear pricing/authorisation; use two distinct
  signed-in accounts and direct Storage API calls to prove denial after
  membership revocation. Do not run migration on a production database
  to "test" it.
- Do not merge into main or certify enterprise use until all these gates pass.
