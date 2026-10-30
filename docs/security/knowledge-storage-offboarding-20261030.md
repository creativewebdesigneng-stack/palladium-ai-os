# Blackstar Knowledge Storage offboarding — security gate

Draft date: 30 October 2026. Stacked on draft PR #1036. **Not deployed or applied to Production.**

## Grounded baseline (read-only Supabase verification)
- Supabase project `palladium-ai-os` has private `knowledge` bucket; `storage.objects` RLS enabled.
- The four `blackstar_knowledge_owner_*` policies are PERMISSIVE and enforce path-prefix ownership for read, upload, update and delete.
- The broader `trusted_media_*_scope` policies are **RESTRICTIVE**, not grants. No general cross-owner leak is claimed. This distinction was checked through `pg_policies.permissive`.
- There are currently **zero** file-backed `memory_documents` rows linked by `storage_path` in the live database (read-only aggregate).
- Draft PR #1036 adds revocation checks on document/chunk/memory rows but original uploaded Storage objects were not tied to membership. On offboarding, the owner's path-based Storage rule could still permit access to their formerly organisation-linked file.

## Candidate policy
- `private.knowledge_storage_owner_can_access(text)` returns **only a boolean**, with an enforced authenticated user ID and exact first path segment.
- A constrained SECURITY DEFINER helper is necessary: the former member must not be allowed to make the org document invisible under caller RLS and then falsely treat its file as unlinked. The helper reads actual linked rows and tests live `private.is_org_member`; it grants no raw content and is inaccessible to `anon`.
- Three RESTRICTIVE `storage.objects` policies intersect existing owner grants on **SELECT, UPDATE and DELETE** for `knowledge` only. They check current membership for every linked organisation source, and reject linkage to another uploader ID.
- Upload/INSERT remains unchanged so existing owner-prefixed upload then ingest continues to work; other Storage buckets are unchanged.
- No new API endpoint, model provider, third-party connector, storage bucket or role-bypass middleware.

## Supported boundaries and remaining risks
- A currently authorised member still **cannot** download another member's original file through the Storage API; this is intentionally stricter than sharing the bounded indexed excerpts.
- A file without any matching `memory_documents.storage_path` is still readable by its path owner, even if it was an orphaned failed organisation upload. That cannot be classified without changing the existing upload path/registration schema. **Not yet complete offboarding.**
- Previously issued signed URLs may stay valid until their own expiry. Database revocation cannot retract downloaded copies or in-flight reads.
- Do not use elevated/service-role clients to bypass these rules.
- The `knowledge` bucket is private, with owner-only prefix policies. The security-definer helper is used exclusively in restrictive policy checks, not as an exposed RPC.
- Existing owner-read policies on knowledge rows, and the new org sharing feature, must be approved/released together for consistent offboarding behavior.

## Required verification
- `bun run test:knowledge-storage-offboarding` runs **the exact proposed SQL migration** against real isolated PostgreSQL with role and ownership fixtures. Includes active/revoked member, own private file, wrong folder, document-owner mismatch, blocked UPDATE/DELETE, anonymous execute denial, unrelated bucket.
- Existing `test:enterprise-knowledge-rls`, all Vitest, TS, build, high-severity audit, browser and worker suites still pass.
- The branch remains **DRAFT**, never merge ahead of PR #1036. A Preview-only app deployment does not apply SQL migrations to the real Supabase database.
- Before any live change: create/approve a truly non-production Supabase project/branch, test direct Storage API signed URL/move/delete with two users and membership revocation, verify bounded audit, then obtain explicit Production approval.
