# Astra certificate trust boundary — native route is not a Groq bootstrap

Blackstar's existing operational `isBlackstarAstraGroqBootstrapConfigured()` and gateway can run a hosted Qwen model through a compatibility-labelled transport. The response is still **third-party model inference**, not a newly trained Blackstar-owned model. That development and QA capability remains unchanged.

Certification now requires an explicit `OPENAI_COMPATIBLE_BASE_URL` and a model pin matching `BLACKSTAR_NATIVE_MODEL`, `BLACKSTAR_ASTRA_MODEL` or the appropriate task-specific model environment variable. The placeholder `blackstar-astra-v0.1` and known Groq bootstrap model `qwen/qwen3.8-27b` cannot qualify merely by being set as a model name. The existing authenticated preflight, text runner, attester and signed case verifier consistently enforce the same rule.

This is **configuration-only eligibility**. It does not verify weights ownership, an endpoint's real upstream provider, model quality, or GPU/serving health. Blackstar must still collect independently evaluated, signed, owner-scoped runs and an independently verifiable model lineage before making ownership or frontier-competitiveness claims.

No Groq connector, generic model gateway, agent authorization, database schema or Production environment variable is changed. A developer can still use Groq bootstrap for exploratory AI tasks. Preview still needs isolated inference and judge routes for actual certification.