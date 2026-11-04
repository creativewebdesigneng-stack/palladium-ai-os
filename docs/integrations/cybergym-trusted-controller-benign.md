# Trusted host-only benign controller sequence (CyberGym QA)

**Scope:** Mission #1050, no vulnerable official targets. This composes **existing** Blackstar QA probes rather than introducing another agent, model gateway, Docker worker, approval system or official CyberGym server.

## Explicit operator invocation

Use on the owner's Windows workstation with Docker Desktop Linux Engine running and `cybergym-internal` present and empty. Requires an existing locally cached `busybox:1.37.0`, the installed `qwen3:8b-q4_K_M`, and Ollama running only on `127.0.0.1:11434`.

```powershell
node scripts/verification/cybergym-trusted-controller-benign.mjs --benign-host-check
```

This call is **opt-in**. It performs these three steps in order, stopping immediately if any prerequisite fails:

1. **Windows-only read-only topology:** reuse `collectLocalCyberGymControllerTopology` to verify local Docker named pipe, Linux Engine, empty/internal/non-attachable `cybergym-internal`, Windows Ollama loopback listener and no Windows `8666` listener.
2. **Native no-tool localhost inference:** reuse the same `cybergym-native-smoke.mjs` model transport (refactored to share code with existing pinned-plan smoke), fixed to `127.0.0.1:11434` and `qwen3:8b-q4_K_M`. Only `GET /v1/models` and `POST /v1/chat/completions`; no credentials, no redirects, no tool calls, no paid/cloud/provider fallback. The response must be **exactly** `READY`, with `finish_reason=stop`. A response `READY.` **fails the strict smoke test** and stops before starting any container. Earlier manually observed owner-local response was `READY.`, so a real run may intentionally report BLOCKED. Do not silently normalize punctuation or call it PASS.
3. **Benign Docker runtime:** only if the model passes, reuse `runOwnerBenignConfinement` to run a cached BusyBox image via its local image ID, with `--pull=never`, `--rm`, no host mounts/port publishing, read-only root, dropped capabilities, no new privileges, non-root, limited PIDs/CPU/RAM; verify empty bridge after cleanup. The Docker Engine remains accessible only to the **trusted Windows host process**, never inside the container.

A successful, owner-observed result reports:
```
TRUSTED_HOST_BENIGN_SEQUENCE_OBSERVED_BENCHMARK_BLOCKED
```

This means the host can sequentially inspect the private environment, perform local no-tool Astra inference and run a harmless contained fixture. It **does not** establish an agent-to-model network route, private official submission server deployment, vulnerable task isolation, source/dataset pins, actual CyberGym execution, independent evaluation or approval. All those claims remain **false** in JSON. The model response text and any environment secrets are never printed.

## Mandatory official-run blockers

- **Upstream privileged server boundary:** official `cybergym.server` uses `docker.from_env()` to create vulnerable/patched containers. Its `/submit-vul` route is not API-key protected (unlike private routes), and its default container creation lacks several hardening controls. Read the [source audit](./cybergym-official-harness-security-audit.md); never make this server publicly available or mount the Docker socket into an untrusted container.
- **Docker Desktop gateway mismatch:** Windows and separate Ubuntu do not own `172.18.0.1`, the observed internal Docker bridge gateway. Do not attempt `0.0.0.0` binds, port 8666 publication, tunnels, or `OLLAMA_HOST=0.0.0.0` as workarounds.
- Pin actual official harness and dataset full Git commits, task image digests and asset sizes, obtain separate owner approval and independently attest official vulnerable/fixed scoring. No official tasks, images or datasets downloaded or executed by this QA phase.
- Continue using existing Blackstar Workforce/Universal Skills Registry/approvals/audit/model routing. This is QA evidence, **not** an autonomous CyberGym agent implementation.

Run offline CI tests:
```powershell
node --test scripts/verification/cybergym-trusted-controller-benign.test.mjs scripts/verification/cybergym-native-smoke.test.mjs
```
The CI model server is a synthetic loopback fixture. Its PASS cannot count as owner GPU/device evidence. No CI test may invoke real Docker or Ollama.

## Failure classification (QA hardening after real owner BLOCKED report)

On the first integrated owner-device run, the CLI printed
`CyberGym trusted benign controller BLOCKED: local stage failed; no approval granted`.
This output is **not evidence of which step failed**. It is a diagnosis-quality defect in
the CLI, not evidence that Astra, Docker or the official benchmark is broken.

The controller now wraps each stage with a small, safe, static failure reason.
Examples (illustrative, **not observed owner-device results**):

```text
CyberGym trusted benign controller BLOCKED: stage=topology reason=stage_observation_failed; no approval granted
CyberGym trusted benign controller BLOCKED: stage=astra_model reason=model_completion_rejected; no approval granted
CyberGym trusted benign controller BLOCKED: stage=benign_docker reason=validation_failed; no approval granted
```

Only fixed categories are permitted; any other model or runtime exception
becomes `model_unclassified_failure` or `stage_observation_failed`.
Raw HTTP bodies, completions, thinking text, errors from host commands,
file paths, credentials and token values are **never echoed**. The exact
model-completion rule remains unchanged: `READY.` still fails where
`READY` is expected. A model-stage failure prevents any Docker launch;
a topology-stage failure prevents model inference and Docker launch.

Even when all harmless stages pass, **benchmark execution remains BLOCKED**.

## Real owner model acceptance failure and safe classification

The operator later reran the improved combined script and reported:

```text
CyberGym trusted benign controller BLOCKED: stage=astra_model reason=model_completion_rejected; no approval granted
```

This is real evidence that the model-stage acceptance rejected the response and
the combined script did not proceed to its Docker phase. It does **not**
identify the exact response content or finish reason. An earlier unrelated
manual local model test returned `READY.`, but the combined run could have
failed for several reasons; do not equate these observations.

The local smoke check now maps *only the final visible completion* to a static,
non-sensitive reason, with no raw text, reasoning, generation trace, private
paths, token values or arbitrary exception strings printed. It rejects:
- `model_punctuation_after_ready` — visible content is precisely `READY` followed only by punctuation
- `model_empty_content` — empty/missing final text
- `model_non_stop_finish` — finish reason other than `stop`
- `model_missing_message` — missing or invalid completion message
- `model_case_mismatch` — response differs only in letter case
- `model_content_mismatch` — some other non-empty response

These are failure *classifications*, not successful output; all fail closed,
skip the benign Docker stage, and leave benchmark execution unapproved. The
strict exact-match requirement `content.trim() === 'READY'` remains
unchanged, as do one POST, one GET, pinned model and local-only transport.

Re-run after fetching the latest QA branch to determine the actual category;
do not change `OLLAMA_HOST`, publish a port, weaken the acceptance criteria,
or use a cloud provider to force a pass.

## Model exit diagnosis: real `non_stop_finish` observation

The owner re-ran the previous CLI and obtained this real result:

```text
CyberGym trusted benign controller BLOCKED: stage=astra_model reason=model_non_stop_finish; no approval granted
```

This **proves only** that the native model completion had a finish reason
different from `stop`. It does **not** independently prove `length`,
missing output, an Ollama bug, or another finish condition. No Docker test
ran in this combined attempt.

Source review found that `cybergym-native-smoke.mjs` sent
`max_tokens:64` with a soft prompt `/no_think` and no explicit Ollama
OpenAI-compatible reasoning control. Ollama documents
`reasoning_effort:'none'` for no-thinking requests; public maintainer
discussion reports `/no_think` alone may be ignored by Qwen3 OpenAI
compatibility, allowing reasoning to consume a short token budget.
Relevant upstream:
https://github.com/ollama/ollama/blob/main/docs/api/openai-compatibility.mdx
https://github.com/ollama/ollama/issues/17969

**Minimal QA correction:** include `reasoning_effort:'none'` on the same
existing localhost-only, no-tool, single-completion request. Keep
`max_tokens:64`, the fixed model and strict visible `READY` plus
`finish_reason:'stop'`. **No fallback**, extra completion attempt or
provider substitution. If the local version ignores this setting, fail
closed and classify `length` as `model_finish_length`; if the backend
reports another non-stop reason use `model_finish_missing`,
`model_finish_content_filter`, or `model_non_stop_finish`.
This changes only the **benign acceptance smoke request**, not the Blackstar
production gateway, and does not prove official CyberGym or general
model reliability.

No raw response, private reasoning, token outputs, credentials or host
paths are logged. The operator must rerun against their real local Ollama
installation to establish whether this is effective; synthetic GitHub CI
cannot prove it.
