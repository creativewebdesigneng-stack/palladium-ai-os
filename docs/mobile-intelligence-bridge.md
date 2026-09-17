# Blackstar Mobile Intelligence Bridge

Blackstar's mobile bridge connects supported native device intelligence to the existing Blackstar/Astra control plane without treating Apple or Google as the sole intelligence provider.

## Contract

Native clients report capabilities at runtime. Blackstar never assumes a device, OS version, model, App Intent/App Function, camera, microphone, or local model is available merely from its platform name.

Routing is capability- and risk-aware:

- safe supported work may remain on-device;
- hybrid work may use the device while Blackstar coordinates or verifies;
- unsupported work falls back to Astra;
- app actions and high-risk operations require explicit approval before execution.

## Native adapters

The iOS client should translate Apple Foundation Models and App Intents availability into `MobilePlatformReport`.

The Android client should translate Gemini Nano / ML Kit GenAI and AppFunctions availability into the same report. Experimental or preview Android capabilities must be reported only when actually available at runtime.

## Security

Device clients must authenticate to Blackstar using a paired, revocable device identity. Raw device secrets must never be stored in repository source or returned to other users. Sensitive device data should remain local unless the user explicitly authorizes transfer. Consequential actions must pass through Blackstar's existing approval/audit mechanisms rather than inventing a second approval system.

## Next integration layer

The platform-neutral core in `src/lib/mobile-intelligence` is intentionally independent of Swift/Kotlin SDKs. Native clients consume this contract through the Blackstar mobile API, while server execution reuses existing Astra routing, approvals and audit infrastructure.
