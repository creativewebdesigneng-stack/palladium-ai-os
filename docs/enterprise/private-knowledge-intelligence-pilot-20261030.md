# Private Knowledge Intelligence — first enterprise delivery pilot (30 October 2026)

## Release status
**Engineering pilot, not sold, certified, or Production-ready.** This is the
first evidence-oriented slice for the proposed £100,000 Private Knowledge
Intelligence Hub offer in Enterprise Solutions PR #1030. It is **stacked on
PR #1030** and must not be merged independently.

## Existing infrastructure reused
- Signed-in Knowledge Management screen and its existing knowledge upload/list
- `memory_documents` / `memory_chunks` and the current hybrid retrieval
- Supabase request authentication and user-owned RLS
- Canonical Memory Fabric revalidation (document row, chunk row, scope)
- Existing memory privacy preferences

No new vector store, model gateway, tenant membership model, financial path,
audit table, service-role client, connector privilege or duplicate runtime.

## This slice
The Knowledge screen offers an explicit, read-only source-evidence pilot.
The user selects 1–3 **ready personal documents** and asks a bounded question.
The server verifies **every** requested document belongs to the authenticated
owner, is ready, and is neither organisation- nor agent-scoped; it refuses the
entire request if any selected document fails. Memory preferences must permit
document recall. It then calls the existing Memory Fabric, and produces at
most eight deduplicated excerpts of 900 characters with document and chunk IDs.

No answer generation occurs. Any unsupported or out-of-scope match is omitted;
absence of a hit does **not** prove the document contains no answer. Neither
the input question nor the result is written to a new table, but existing
provider infrastructure or platform telemetry may have their own logging and
retention policies: do not advertise a zero-retention guarantee.

## Customer acceptance programme (not yet performed)
1. Customer signs a DPA and identifies one accountable data steward, a
   designated owner and approved test data. Review applicable privacy,
   subprocessors, deletion, retention and security requirements first.
2. Buyer defines 30–50 labelled questions including direct evidence, ambiguous
   facts, contradictions, missing facts and instructions embedded in documents.
   Keep the evaluation set private to the customer.
3. Owner uploads approved personal fixtures and confirms indexing, delete and
   document-memory preference enforcement. Follow up with negative tests for
   missing, unready, other-user, other-organisation and agent-scoped records.
4. For each question, capture returned document/chunk IDs, source freshness,
   retrieved text and expected authorised sources. Score *retrieval recall and
   precision* against the labelled reference **outside** this UI.
5. If a later optional answer-generation layer is used, independently score
   answer correctness, citation faithfulness, abstention, prompt-injection
   robustness and unauthorised disclosure. Do not assume a retrieved snippet
   makes a model answer correct.
6. Validate real user membership, SSO, document-level ACLs, tenant-boundary
   tests, incident handling, audit export, accessibility, throughput, availability,
   backups and operational support separately before enterprise deployment.
7. Customer signs pilot UAT with recorded failure cases and remediation. No
   £100,000 sale quote should be issued solely on this prototype.

## Limits & truth in advertising
- **Personal-document-only**, not a customer-wide multi-user repository.
- Up to three selected ready documents; eight excerpts. Search can miss hits
  under rank/limit constraints or if embeddings are unavailable.
- Does **not** implement tenant RBAC, SSO, connectors to three repositories,
  private hosting or SLA guarantees. Those belong to later acceptance gates.
- No medical/legal advice, user impersonation, payments, documents exported or
  external writes.
- Synthetic unit fixtures prove helper policies, **not** live tenant isolation.
- Preview and CI gates are required; customer end-to-end acceptance remains
  BLOCKED until real signed-in owner- and cross-tenant exercises.

## Rollout policy
Own branch, draft PR, GitHub audit/build/typecheck/tests and Vercel Preview
only after green exact-commit CI. No Production, migrations, merges or pricing
changes in this slice. Preserve PR #1030 and security PR #1034 unmerged.
