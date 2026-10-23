# Astra trusted scoring: response-to-score and judge identity reconciliation

The original matching-runs verifier checked that the number of model responses matched the number of evaluator scores, but did not require a one-to-one mapping by response ID. For secure certification, equal record counts are insufficient. This patch introduces a reusable **pure** validator required by both the run attester and the authoritative certification progress verifier.

It verifies each response and score belongs to the exact run; no repeated response IDs or repeated score targets; each response has one score; numeric grades are finite within [0,100]; the evaluator type is llm_judge; and the score's recorded criteria and judge name match the case and run. Existing signatures remain unchanged, so historical evidence is not silently rewritten.

The case-matching verifier also rechecks trusted judge identity and, for FreeLLM, the explicitly pinned independent routed-provider/model recorded on each score. This is stricter than merely accepting a signed blob and does not grant any additional permissions.

This is not real model certification: the current Production model_eval_runs table was empty at the last read-only inspection. Real candidate and independent judge inference, exact persisted evidence, and authenticated browser-agent acceptance are still necessary. Keep PR #1025 draft and Production unchanged pending release gates.