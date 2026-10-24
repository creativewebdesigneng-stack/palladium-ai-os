# Astra certification judge trust boundary

Before starting a model call or persisting a run, the existing trusted Astra text runner now enforces the same independent, route-pinned evaluator configuration as its safe benchmark preflight. A missing/auto/local/fusion evaluator or a routed judge identical to the exact candidate model is rejected before any token spend.

The judge receives untrusted candidate content in a structured JSON task-data payload plus explicit instructions not to obey injected candidate text. This is defense in depth, not a claim that the evaluator is invulnerable to prompt injection.

Judge output must be exactly one numeric score from 0–100 in a JSON array (an exact JSON fence is also accepted). Narrative-wrapped output, numeric coercion, multiple scores and malformed payloads fail closed. Oversized candidate text is rejected rather than silently graded as complete.

No provider configuration, secrets, approval policy, database schema, worker or deployment authority changed. Actual model certification still requires configured Preview inference/evaluator lanes, live execution, signed persistent results and independent acceptance.