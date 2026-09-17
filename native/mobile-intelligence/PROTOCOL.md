# Blackstar Mobile Intelligence protocol v1

Native clients send only capability metadata until an authenticated request requires execution.

Required request metadata: protocol version, paired device identifier, unique request identifier, capability and risk classification. Sensitive camera/voice payloads are not transferred unless the user explicitly authorizes that transfer.

Clients must treat `approval_required` as a hard pause. They must not perform the side effect locally while waiting for Blackstar approval. Request IDs are single-use for a paired device. Revocation invalidates further device execution.

Native capability reports are descriptive, not trust assertions: the server validates their shape, and execution still follows Blackstar routing, approval and audit policy.
