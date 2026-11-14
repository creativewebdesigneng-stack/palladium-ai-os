# Knowledge storage RLS

`supabase/migrations/20261114212000_knowledge_storage_restrictive_owner.sql` is the storage migration for the knowledge bucket. It is additive. It does not create a bucket, rewrite other buckets, or backfill files.

## Which drafts it supersedes

PR #1037 (`security/knowledge-storage-offboarding-20261030`) and PR #1038 (`security/enterprise-knowledge-storage-isolation-20261030`) both add knowledge storage policies, and neither is an ancestor of PR #1048. #1048's enterprise knowledge screens and share-audit migration do not include those storage files, so merging #1048 would still leave this gap. This migration supersedes the storage drafts in #1037 and #1038. It does not supersede #1048's product work.

#1038 adds restrictive policies so a permissive storage rule cannot widen the knowledge bucket. #1037 adds the live-membership check so an uploader who has left an organisation cannot keep reading a linked organisation file. Both properties are in this one migration. The permissive owner-prefix policies already on main stay in place; the new policies are restrictive, so they narrow access.

## Behaviour

- A knowledge object is readable, updatable or deletable by the authenticated user only when the path starts with that user's id.
- If a `memory_documents` row points at the path, that row's `user_id` must be the caller, and a non-null `org_id` requires `private.is_org_member`.
- An upload that is not indexed yet remains available to its uploader for one hour, then stops.
- Objects in other buckets are unaffected (`bucket_id <> 'knowledge'`).
- Signed URLs that were issued before a membership change stay valid until they expire. This migration does not revoke them.

Do not apply it to production from this branch. Apply it with the same backup step as the agent-economy plan.
