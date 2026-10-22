# Astra benchmark evidence-authority hardening

The benchmark plan previously counted completed cases from run metadata alone, without verifying signed provenance or attached candidate responses and independent judge scores.

The plan now reuses the existing exact-owner, signed verification pipeline. The verifier checks completed runs against suite, case, prompt, model and pinned execution context; validates persisted response and judge-score rows; and validates the HMAC of the attested evidence. Only returned case IDs may be shown as completed. A missing model serving route yields zero verified cases.

The change adds no new database table, model route, evaluation criteria, authority grants, or provider connection. Historical v1 runs cannot be counted as v2; vision remains on v1.

Read-only Production check during this development showed zero rows in model_eval_runs. CI tests do not establish actual evaluation scores. Real certification still requires authorized provider inference, independent evaluation, and persisted evidence; Production remains unchanged.