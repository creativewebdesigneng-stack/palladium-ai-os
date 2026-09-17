# Mobile Intelligence core

This package is the provider-neutral Blackstar control layer for native mobile intelligence.

Implemented boundaries:

- runtime Apple/Android capability reports;
- device / hybrid / Astra routing;
- consequential-action approval gating;
- sensitive camera/voice transfer consent;
- revocable device pairing model;
- RLS-backed device persistence schema;
- strict inbound validation;
- bounded native action identifiers and payloads;
- immutable audit envelope construction;
- Swift and Kotlin native capability-reporting boundaries.

This package does not bypass Blackstar's existing approval, identity, audit, model-routing or agent systems. Native SDK availability must be detected by the shipping iOS/Android application. Web CI cannot certify physical-device SDK execution.
