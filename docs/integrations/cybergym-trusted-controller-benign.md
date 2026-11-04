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
