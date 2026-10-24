# Astra candidate route diagnostic response-body integrity

The authenticated fallback candidate diagnostic consumes remote `/models` responses without trusting or exposing arbitrary provider data. Its 5-model-identifier display limit is separate from actual membership checking: a pinned model may appear at any position in the bounded response. For both OpenAI-compatible and Ollama-shaped responses, membership tests scan all valid model IDs in that bounded data. UI diagnostics still display at most five sanitized identifiers.

The HTTP body is capped at 128 KiB, including chunked responses without Content-Length. Its 20-second timer now remains active while the models body is read, not only while response headers arrive. Invalid/oversized listings cannot establish that a pinned candidate is absent; the diagnostic uses a conservative unknown result and does not expose arbitrary upstream response bodies. Redirects remain forbidden and credentials stay restricted to the pinned server endpoint.

These changes affect only error diagnostics, not the independent judge, model gateway, certification benchmark scores, database migration, or agent execution. Actual inference and model lineage remain unverified.
