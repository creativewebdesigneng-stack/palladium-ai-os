# FreeLLMAPI integration audit — 2026-08-30

## Source and licence

The supplied `freellmapi-main.zip` is FreeLLMAPI by Tashfeen Ahmed and is distributed under the MIT License.

The source application is a complete model gateway/router with its own server, client UI, encrypted provider-key storage, model catalogue, quota/rate-limit accounting and provider fallback loop. It exposes an OpenAI-compatible `/v1` API and can route over multiple configured upstream providers.

## PalladiumAI overlap audit

PalladiumAI already has a provider-neutral model gateway, model routing for agents, cross-provider fallback, server-only model credentials, Runtime Models UI, execution telemetry and an OpenAI-compatible `compatible` provider lane. Jan already uses that same compatible lane.

Importing FreeLLMAPI's server, frontend, database, key store or routing engine into PalladiumAI would create competing implementations of systems PalladiumAI already owns. Those components are therefore deliberately not copied.

## Native integration decision

FreeLLMAPI is supported as an optional separately deployed OpenAI-compatible upstream behind PalladiumAI's existing `compatible` provider.

Configure:

```text
OPENAI_COMPATIBLE_BASE_URL=https://your-freellmapi-host.example/v1
OPENAI_COMPATIBLE_API_KEY=your-endpoint-key-if-required
```

PalladiumAI continues to own agent model assignment, runtime policy, outer provider failover, tool execution and telemetry. FreeLLMAPI owns routing inside its configured upstream pool, including its own provider availability, quota/rate-limit awareness and fallback behaviour.

The existing PalladiumAI request path appends `/chat/completions` to `OPENAI_COMPATIBLE_BASE_URL`, so a FreeLLMAPI deployment should expose its `/v1` prefix at that environment variable.

## User experience

No new page is created. FreeLLMAPI is surfaced in the existing **Runtime Models** provider card alongside Jan as a supported OpenAI-compatible integration. This keeps model configuration discoverable without duplicating Model Hub/runtime navigation.

No database migration is required. Existing agent `model_provider = compatible` assignments and existing model execution telemetry remain authoritative.

## Source-derived capabilities retained

The integration explicitly records the useful FreeLLMAPI characteristics that sit behind the OpenAI-compatible boundary:

- provider pooling;
- rate-limit-aware routing;
- fallback routing;
- streaming;
- tool-call compatible chat requests.

These are delegated upstream rather than reimplemented inside PalladiumAI.

## Security boundary

FreeLLMAPI endpoint credentials remain server-only through the existing `OPENAI_COMPATIBLE_API_KEY` environment variable. PalladiumAI does not return that value to the browser. Provider keys managed inside a FreeLLMAPI deployment remain owned by that deployment rather than being duplicated into PalladiumAI.
