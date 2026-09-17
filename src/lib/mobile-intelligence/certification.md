# Mobile Intelligence certification gates

Blackstar Mobile Intelligence is not 100% production-certified until all of these are evidenced:

1. TypeScript core tests and full repository Backend Check pass.
2. Device/audit/replay migrations are applied and RLS verified in production.
3. Authenticated device pairing and revocation work end-to-end.
4. Astra fallback executes through the existing governed Blackstar runtime.
5. Consequential native actions pause for the existing Blackstar approval flow.
6. iOS native target compiles and is tested on a supported Apple Intelligence device; Foundation Models availability and App Intent invocation are observed.
7. Android native target compiles and is tested on a supported Gemini Nano device; local model availability and supported AppFunctions integration are observed.
8. Sensitive camera/voice context remains local unless explicit transfer consent is recorded.
9. Production telemetry/audit contains metadata only, not raw prompt/device context.
10. Revoked devices and replayed request IDs cannot execute.

The web/server implementation may reach code-complete before gates 6–7. That state must be reported as server-ready, not as physical-device certification.
