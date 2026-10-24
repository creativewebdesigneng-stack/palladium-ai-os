# Astra Certification Workbench — operator preflight and batch consent

The existing authenticated certification endpoint already supplied configuration-only preflight. The Workbench previously used only candidate model identity and judge name, allowing a user to attempt a text run even when the actual independent route was unpinned.

The Workbench now checks the server preflight state `configured_unprobed` AND the explicit `canAttemptTextCertification` flag before enabling text cases. Unknown/stale preflight responses block text execution. The operator sees safe missing candidate/evaluator messages and explicit caution that configured routes have not been independently tested.

The existing auto-run and fast-qualification paths now require opt-in batch consent on screen and at mutation entry, explaining possible provider charges and stop-after-current-case behavior. Consent resets across task classes and when each batch completes or fails. A single authorized case can still be run without batch consent when server preflight passes.

Vision retains its separate approval and judge rules. Existing server authentication, tenant boundaries, evaluator pinning, audit, HMAC attestation and model routing remain authoritative. This patch does not provision model credentials or create any new authority.