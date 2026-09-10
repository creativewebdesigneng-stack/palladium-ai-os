# Astra GPT-OSS 20B certification runtime v2

Trusted GPT-OSS 20B certification uses a signed execution profile that is enforced by the model gateway:

- exact candidate model identity
- 512 maximum output tokens
- 60,000 ms candidate timeout
- explicit `reasoning_effort: low`
- one transport attempt
- no candidate fallback

The profile is persisted into Astra certification provenance and compared during attestation. General model-gateway calls retain their existing default retry budget unless they explicitly opt into a different `maxAttempts` value.
