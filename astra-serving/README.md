# Blackstar Astra-class open-weight serving bundle

This directory is a reproducible baseline for serving a **Blackstar-controlled open-weight model** behind the provider-independent compatible-model contract already used by Blackstar.

It does **not** contain OpenAI model weights, does not call GPT-6 Astra, and does not imply benchmark parity. The checkpoint is deliberately operator-selected and must earn routing authority through Blackstar's existing Model Arena / verified-evidence path.

## What this bundle provides

- pinned `vllm/vllm-openai:v0.28.0` GPU inference server
- exact Blackstar model alias via `--served-model-name`
- vLLM prefix caching enabled
- vLLM bound only to the private Compose network
- nginx reverse proxy as the only published service
- bearer authentication at the proxy boundary
- external allowlist limited to:
  - `GET /v1/models`
  - `POST /v1/chat/completions`
- all other vLLM routes return `404`
- no model or API secret is committed to this repository

The proxy allowlist is intentional. vLLM documents that its built-in API-key option does not protect every server endpoint, so Blackstar does not expose the raw vLLM listener to the internet.

## GPU host prerequisites

Use a Linux host with a working NVIDIA container runtime and enough aggregate GPU memory for the checkpoint you select. Large MoE/frontier-class open weights can require multi-GPU or multi-node infrastructure; this Compose baseline does not pretend one GPU is sufficient.

Docker Compose must support GPU reservations and the host must make `--gpus all` available to containers.

## Configure

```bash
cd astra-serving
cp .env.example .env
```

Set at minimum:

```dotenv
BLACKSTAR_MODEL_REPOSITORY=<open-weight-checkpoint-or-local-path>
BLACKSTAR_SERVED_MODEL_NAME=blackstar-astra-v0.1
BLACKSTAR_ASTRA_API_KEY=<long-random-secret>
```

If the model needs more than one GPU, set `BLACKSTAR_TENSOR_PARALLEL_SIZE`. Keep `BLACKSTAR_MAX_MODEL_LEN` conservative until the selected checkpoint and GPU topology have passed memory/load testing. A target context window is not proof that a checkpoint can safely serve that length.

## Start

```bash
docker compose up -d
```

Check container state:

```bash
docker compose ps
```

The gateway defaults to port `8080`. Put it behind your infrastructure's TLS/load-balancer layer; do not expose plain HTTP over the public internet.

## Smoke test

From a trusted host:

```bash
curl -fsS \
  -H "Authorization: Bearer $BLACKSTAR_ASTRA_API_KEY" \
  http://GPU_HOST:8080/v1/models
```

The response must contain the **exact** value of `BLACKSTAR_SERVED_MODEL_NAME`. Blackstar's runtime performs the same exact-identity readiness check before accepting a verified Astra route.

Then test generation:

```bash
curl -fsS \
  -H "Authorization: Bearer $BLACKSTAR_ASTRA_API_KEY" \
  -H "Content-Type: application/json" \
  http://GPU_HOST:8080/v1/chat/completions \
  -d '{"model":"blackstar-astra-v0.1","messages":[{"role":"user","content":"Return the word ready."}],"max_tokens":16}'
```

Replace the model string if you changed `BLACKSTAR_SERVED_MODEL_NAME`.

## Connect the Blackstar web deployment

After TLS is configured on the serving host, set these **server-only** values in the Blackstar deployment secret manager:

```dotenv
OPENAI_COMPATIBLE_BASE_URL=https://YOUR-ASTRA-GATEWAY.example/v1
OPENAI_COMPATIBLE_API_KEY=<same long random gateway secret>
BLACKSTAR_ASTRA_MODEL=<exact BLACKSTAR_SERVED_MODEL_NAME>
```

Specialist model environment variables are optional. Leave them unset unless the same compatible serving endpoint actually exposes those exact model identities:

```dotenv
BLACKSTAR_ASTRA_REASONING_MODEL=
BLACKSTAR_ASTRA_CODING_MODEL=
BLACKSTAR_ASTRA_AGENTIC_MODEL=
```

Blackstar will fail closed if verified evidence selects a model identity that `/v1/models` does not currently expose.

## Certification is a separate gate

A live server is **not** a certified intelligence model. The promotion sequence is:

1. deploy the chosen open-weight checkpoint under an exact served-model identity;
2. confirm Blackstar runtime readiness sees the exact identity as live;
3. run the checkpoint through Blackstar Model Arena for the relevant task classes;
4. certify only verifier-owned results that meet the existing sample, hash, scope, freshness, provider and exact-model binding requirements;
5. allow Native Intelligence routing to promote that model only from fresh verified evidence.

If the Model Arena / verified-evidence tables are unavailable, leave routing on the existing explicit fallback. Do not create a duplicate evaluation store just to make the status green.

## Security boundaries

- Keep the raw vLLM `model:8000` service private.
- Terminate public TLS before the nginx gateway.
- Restrict network ingress to Blackstar application egress addresses where your infrastructure supports it.
- Rotate `BLACKSTAR_ASTRA_API_KEY` through a secret manager, never source control.
- Load only checkpoints you trust; model files are part of the software supply chain.
- Review the pinned vLLM version against current upstream security advisories before every production rollout and update deliberately through CI rather than floating on `latest`.
- Do not enable arbitrary remote-code execution for model loading unless a separately reviewed checkpoint absolutely requires it.
- Model-serving availability and benchmark evidence never grant tools, approvals, identity, delegation, or external execution authority inside Blackstar.
