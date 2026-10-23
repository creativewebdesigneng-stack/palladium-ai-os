# Astra exact-model qualification: certification score floor

The Native Intelligence routing kernel already requires at least 20 evaluation samples and normalized score >=0.75. Astra's certification display and server issuer previously counted distinct signed runs but could still issue `model_eval_verified_evidence` from 20 low scoring runs, because its existing database RPC normalizes scores but does not enforce a minimum.

Before marking an Astra class `readyToCertify` or calling the existing service-role RPC, the server now computes an aggregate **only from signed, owner-scoped, independent-judge-validated, distinct-case runs**, averaging scored responses of the exact candidate model per run. This mirrors the RPC's per-run and per-case normalization; unrelated higher-scoring reference models cannot raise the result.

The minimum score is imported from the existing `NATIVE_INTELLIGENCE_MIN_EVAL_SCORE` constant (0.75) rather than introducing another threshold. Zero, invalid, absent, duplicated or low-quality evidence does not issue new model certification. The UI can display an evidence-derived partial average but never claim the certification is ready merely from a full case count.

This is a trust gate, not higher intelligence or independently verified model accuracy. Genuine Preview candidate and independent evaluator serving, live responses, persisted audit records and authenticated tool execution still need certification. No database migration, model routing change, credential copy or Production deployment.