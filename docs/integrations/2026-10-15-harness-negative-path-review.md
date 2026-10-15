# Harness archive negative-path review

Both uploaded Harness collections remain reference material composed into Blackstar's existing harness. The extended collection's checklist calls for secret-free context, explicit network permissions and verification gates. The compact collection supplies a taxonomy and reference links, not an executable runtime. Neither archive was installed or executed.

## Findings and implementation

- The existing credential scanner returned safe when nesting exceeded eight levels. It now rejects uninspected input at the depth boundary, at a 10,000-node inspection budget, or on repeated/cyclic object references. This conservative bound can reject a large legitimate payload; callers must reduce nesting or size rather than bypass inspection.
- The existing tool choke point reduced an HTTP(S) URL to its hostname before policy evaluation. That erased embedded URL credentials and discarded parse failures. It now checks the original URL through existing domain normalization and scope enforcement.
- A rejected URL could have been copied into tool-execution input metadata. Both existing tool wrappers now record a redaction marker for harness-denied input while preserving owner, tool, status and policy code. No blocked payload is persisted by these log paths.
- The existing delegation policy helper accepted negative, fractional or non-finite depth values. It now rejects those and malformed/oversized tool lists. This hardens the helper and policy preview; it does not create or certify a new executable delegation runtime.

No model-driven security decision, new runtime, external service, permission grant, activation, database migration or archive skill installation is introduced. Approval and scanner requirements remain in place. The previously deferred audit credential repair and final scientific import remain paused.

## Verification

Full regression: 2,583 tests passed across 626 files, including 19 additional cases. Production build passed; TypeScript, exact-head CI, dependency audit and deployment evidence are recorded in the PR. Execution tests prove deep input is denied before provider preparation, execution or approval creation; both core and local-extension wrappers redact denied credential-bearing URLs. Safe reads and valid allowed web targets retain existing behaviour.

## Remaining programme blockers

The scientific collection remains 176/177 imported and disabled; the last import needs the deferred required-audit credential repair. Diagram Design remains imported and disabled. OpenViking still needs licensing/service/isolation review and credentials; AgentMemory needs a reviewed authenticated HTTPS gateway and tenant isolation; the external Browser Use Python runtime is not connected. Harness guidance adoption and passing checks are not an independent reliability benchmark or a claim that every provider is operational.
