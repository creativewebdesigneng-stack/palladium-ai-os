# Blackstar Private Knowledge Intelligence — buyer-labelled evidence evaluation

**Status: draft offline engineering acceptance aid, not enterprise certification or customer sign-off.**

This extends the first proposed **£100,000 Private Knowledge Intelligence Hub** acceptance programme without creating another retrieval engine, agent, database, payment service, user role or model gateway. It reuses the evidence-only output contract from the private and organisation Knowledge pilots.

## Outcome and limitations

The buyer or nominated data steward labels approved passages for a representative set of **30–50 questions**. Run the existing, authorised Knowledge evidence preview separately for each question in an approved non-production environment and capture the resulting packet only under the buyer's data-handling rules. Feed these packet objects and test labels into the local, offline evaluation command. The evaluator reports *aggregate* retrieval quality and policy-contract failures.

It does **not** fetch documents or authenticate against Supabase. The allowlist is supplied by the evaluator's operator, not checked against live RLS. A clean run cannot prove tenant isolation, private model deployment, SSO, answer generation, citation faithfulness, legal compliance, ROI or accepted commercial scope. Existing protected two-user Supabase/Data/Storage tests and signed-in UAT remain independent requirements.

## Test data and procedure

- Use **buyer-approved** cases, including direct answers, ambiguous wording, contradictions, no-evidence cases, and hostile/prompt-injection source text.
- The buyer labels relevant **document/chunk citations** independently of the retrieval result. Do not retroactively define a returned hit as relevant merely because Blackstar returned it.
- Choose 1–3 *selected* approved document IDs per case; these IDs must be the exact selected documents for that request. A selected-document list is a fixture assertion, **not** an authority grant.
- Store labelled fixtures and source excerpts in the buyer-approved, access-controlled test workspace only. Do not commit customer fixtures, questions, excerpts, names, access tokens, storage URLs or source identifiers to GitHub or attach them to CI.
- Do not run this evaluator against Production. The command makes no network calls and writes no files, but the input JSON can contain excerpts and must still be handled as sensitive.
- Report relevant source coverage separately from answer correctness. This evaluator **does not generate answers**.

## Input contract (illustrative synthetic fixture only)

One item in the top-level "cases" array looks like this:

~~~json
{
  "schemaVersion": 1,
  "cases": [
    {
      "category": "direct",
      "allowedDocumentIds": ["00000000-0000-4000-8000-000000000001"],
      "expectedCitations": [
        "document:00000000-0000-4000-8000-000000000001#chunk:00000000-0000-4000-8000-000000000002"
      ],
      "observed": {
        "status": "retrieved_excerpts",
        "evidenceOnly": true,
        "answerGenerated": false,
        "requestedDocumentCount": 1,
        "matchedDocumentCount": 1,
        "excerpts": [
          {
            "documentId": "00000000-0000-4000-8000-000000000001",
            "chunkId": "00000000-0000-4000-8000-000000000002",
            "citation": "document:00000000-0000-4000-8000-000000000001#chunk:00000000-0000-4000-8000-000000000002",
            "excerpt": "Synthetic approved test passage."
          }
        ]
      }
    }
  ]
}
~~~

Categories: "direct", "ambiguous", "contradiction", "no_evidence", "prompt_injection". Use zero expected citations for a no-evidence case. Input can contain up to 200 cases; packet contract permits up to eight excerpts of 900 characters each. Actual production UAT samples should be separated from this synthetic sample.

## Local run

~~~bash
node scripts/verification/enterprise-knowledge-buyer-evaluation.mjs --self-test
node scripts/verification/enterprise-knowledge-buyer-evaluation.mjs --input /approved/local/path/buyer-labelled-evaluation.json
~~~

The second command writes aggregate-only JSON to **stdout**, with no document IDs, text excerpts, or test question text. Capture aggregate results only in the buyer-approved evidence register. Exit status is 0 for structurally safe observations, 2 for a scope/provenance/contract violation, 1 for a malformed fixture or invocation. **Exit 0 is not a customer acceptance decision**; poor citation recall or false positives are still possible and must be assessed against buyer-agreed targets.

The CI workflow runs **only the self-test** with in-code synthetic records. Never send real fixtures to CI.

## Metrics, boundaries and decision

- **Citation precision** = uniquely relevant returned citations / all returned citations. Undefined when none returned.
- **Citation recall** = uniquely relevant returned citations / independently labelled expected citations. Undefined with no labelled expected citations.
- **Answerable hit rate** = questions with an expected relevant citation and at least one relevant retrieval / all answerable questions.
- **Correct empty rate** = questions labelled with no relevant source where the packet correctly returned no excerpts / all such questions.
- Safety-contract counters separately flag excerpts from non-selected documents, citation/ID mismatch, duplicate citations, bad status/counts or exceeded output limits.
- Safety-contract counters must be zero before advancing to live acceptance, but are a **local assertion against a supplied allowlist**, not proof of actual RLS.
- A buyer must preagree quality thresholds and investigate all individual errors **inside their secure workspace**; the aggregate-only report deliberately does not expose failing question IDs.
- After independent review, run real two-user authentication, org membership revocation, Storage/Data API denial, signed-URL expiry behaviour, privileged caller review, privacy and SSO, audit export, access-control and source provenance, customer UAT, support capacity and legal/commercial acceptance.

## Release and dependencies

This remains stacked on **draft PR #1040** (and its draft dependencies #1036, #1035, #1030, #1034). Do not merge, migrate Supabase, deploy to Production, request buyer data, activate payments or claim delivery of a £100,000 contract as a consequence of a synthetic passing self-test.
