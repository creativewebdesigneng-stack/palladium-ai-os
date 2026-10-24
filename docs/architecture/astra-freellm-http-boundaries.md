# Astra independent evaluator HTTP boundary

The existing FreeLLM independent evaluator client now refuses HTTP redirects, which prevents transparently forwarding a trusted grading request toward an unintended destination. Only its configured endpoint is contacted.

Remote responses are bounded to 256 KiB using a streaming byte counter as well as the optional Content-Length header. The evaluator's usual 1000-token JSON result fits within that limit; large, untrusted HTTP response bodies fail closed. Error bodies are not embedded in exception messages because remote gateways may echo credentials or scoring prompts.

This protects the existing evaluation transport and does not establish model quality, judge independence or native weight ownership by itself. The actual authenticated runner still verifies exact pinned route identity, signed evidence and the owner-scoped evaluation protocol. No credentials, external services, connectors, migrations, or agent approval paths were modified.

Tests cover redirect policy, credential-bearing request headers, exact pinned route, declared oversized payloads, streaming oversized payloads and bounded remote error details.
