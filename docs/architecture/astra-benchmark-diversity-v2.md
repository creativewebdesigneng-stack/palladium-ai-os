# Astra cognition benchmark calibration — v2 reasoning and coding

The original Astra v1 text certification catalogue repeated essentially identical tasks 20 times under different headings. That is not sufficient evidence of broad reasoning or coding aptitude.

This PR introduces 20 **distinct authored calibration prompts** for reasoning and 20 for coding, using the existing verifier-signed suite/case/prompt/profile attestation. The `reasoning` and `coding` suite and case IDs become **v2**. Older v1 runs remain stored historically, but cannot silently attest these new case IDs. There is no migration, re-signing or model promotion.

Other task classes keep v1 pending equivalent review; **vision must retain v1** because its deterministic PNG and ground-truth generator currently validates v1 case IDs.

This is an improvement in *benchmark diversity*, **not** a secret holdout set or model advancement. The authored prompts are visible to developers and are graded by the existing judge infrastructure; their quality and leakage resistance have not been independently validated. Credible external-model comparisons still require independent held-out tests, matched tool/budget conditions, reproducible artifacts, blind judging and human evaluation. In particular, coding prompts are design prompts; they are not a substitute for executing candidate patches against hidden tests or SWE-bench tasks. No trained weights or new model provider is introduced.

**Acceptance:** CI checks distinct scenarios and versions; existing judge provenance verifies exact prompt hashes. No real model certification is assumed until authenticated runs are completed and evidence has been persisted. Production release follows parent PR #1022 and preview/agent acceptance controls.
