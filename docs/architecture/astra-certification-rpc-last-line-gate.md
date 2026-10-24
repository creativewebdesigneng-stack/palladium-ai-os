# Astra certification: database last-line qualification gate

The existing generic Native Intelligence `certify_native_intelligence_model_evaluation` service-role RPC is shared by model qualification workflows. It originally checked exact owner, completed run count and overall score bounds, but did not restrict a service-role caller to unique signed Astra cases or require Astra's 0.75 quality floor.

**Astra-specific additional checks only when `p_model_id='blackstar-astra-v0.1'`:** all input runs must have verified Astra activation metadata that matches the versioned suite, task class, pinned provider/model, nonempty case ID and provenance signature; every case ID must be distinct. Only LLM-judge scored responses are counted, and the normalized candidate score must meet 0.75 before verified evidence is inserted.

**Compatibility:** non-Astra model IDs retain the original generic RPC behavior, including support for other evaluation methods. Existing service-role-only grants are unchanged; anonymous and authenticated direct callers remain revoked. The SQL does not recalculate signed HMAC; the caller still requires the application-layer signed verifier.

The migration is staged in draft PR #1025, **not applied to any live Supabase database**. It requires independent isolated Postgres positive and negative execution tests and review before controlled migration rollout. A READY Preview build does not imply a database migration has been deployed.