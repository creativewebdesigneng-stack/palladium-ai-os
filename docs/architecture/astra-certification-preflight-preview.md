# Astra text-certification preflight — Preview and Production separation

Blackstar's existing authenticated certification runner requires an Astra model route and an independent, pinned FreeLLM evaluator route. The new read-only preflight is attached to the existing getAstraCertificationBenchmark response; it does not create model runs, provision credentials, modify permission policy, expose endpoint URLs or assert a successful provider call.

`configuration_missing` means at least one required route is absent, and `configured_unprobed` means variable configuration exists but no real HTTP/provider/independent-judge execution has been verified. Actual successful execution still requires model connectivity, current credentials, pinned evaluator response identity, owner scope, audit, and signed HMAC evidence.

Current Vercel non-decrypted environment listing showed compatible model and evaluator environment-variable names scoped to Production, but no matching Preview-scoped ones. The existing Groq preview key alone is a candidate bootstrap, not a complete independent evaluation configuration. Do not copy Production secrets to Preview or expand access without deliberate authorization.

Vision retains its separate model and evaluation flow; the text preflight must not claim multimodal certification.

Next: establish least-privilege Preview-only model and evaluator routes, run one authorized benchmark case, verify persisted response/judge rows and signature, then attempt a controlled 20-case suite and separately evaluate cost/quality. Do not promote Production until user-visible QA and release gates pass.