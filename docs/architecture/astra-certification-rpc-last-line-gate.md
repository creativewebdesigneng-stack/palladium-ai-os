# Astra certification: database last-line qualification gate

The existing `certify_native_intelligence_model_evaluation` service-role RPC checked the number and completion status of input Model Arena runs, but not their versioned suite membership, unique case IDs, independent judge record type, or score floor. Application-layer checks added in PR #1025 enforce those properties, but the database insert should also fail closed if another service-role caller or concurrent update skips the application gate.

This migration replaces the **same** RPC signature with more restrictive checks *before inserting evidence*: the exact 20-or-more completed run IDs must share a user/workspace, carry signed Astra activation metadata matching suite/task/provider/model, have unique case identifiers, and contain scored exact-model responses from `llm_judge`. The normalized score must be >=0.75, matching `NATIVE_INTELLIGENCE_MIN_EVAL_SCORE` in the application.

Supabase service-role permission is preserved, while anonymous and authenticated direct callers remain revoked. This SQL does not validate the HMAC itself; the existing server verifier still does. It does not replace independent evaluation or blind external benchmarks.

This is staged as a migration in draft PR #1025 and **has not been applied to the live Supabase project**. The database migration must be reviewed and applied in a controlled release, followed by isolated Postgres positive/negative transaction tests and genuine authenticated model evaluation. Preview deployment alone does not migrate Production.