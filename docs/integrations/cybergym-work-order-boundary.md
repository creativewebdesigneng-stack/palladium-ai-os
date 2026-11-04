# CyberGym trusted host work-order boundary — benign only

**Scope:** Draft QA work for Blackstar Worker Mission #1050. This adds a minimal data-only contract between an untrusted proposed work order and the existing, operator-invoked Windows host benign-controller acceptance. **It does not create a new Blackstar approval system, agent runtime, model gateway, Docker controller, evaluator server or privileged worker.**

## Why this boundary is needed

Real owner evidence on the Windows GPU workstation has established:
- Host-side Qwen3 `qwen3:8b-q4_K_M` no-tool response with exact `READY` and `finish_reason='stop'`, completion latency **324 ms for one acceptance run** after setting `reasoning_effort:'none'`.
- Restricted cached BusyBox container with previously observed **8/8** benign confinement controls.
- Empty `cybergym-internal` bridge after benign run; Windows Ollama only on `127.0.0.1:11434`.
- Combined host-only controller status `TRUSTED_HOST_BENIGN_SEQUENCE_OBSERVED_BENCHMARK_BLOCKED`.

Those results **do not** establish an official CyberGym run or scoring, a secure Docker-privileged submission server, or agent access to the local model. The upstream CyberGym server can execute user-submitted PoCs and needs Docker Engine authority. Its `/submit-vul` route is not protected by the admin API-key requirement. See [official harness audit](./cybergym-official-harness-security-audit.md).

A request from a model/agent must **never** be accepted as executable operator approval by including `approved`, `approvalToken`, shell commands, images, URLs, model providers, Docker flags, credentials or task IDs. Only Blackstar's existing trusted approval/audit system may eventually authorize separately reviewed real tasks; this QA bridge has no such connector or grant.

## Strict request contract

The **only** benign work order supported by the offline host CLI is:

```json
{
  "schema": "blackstar.cybergym.work-order.v1",
  "action": "benign-trusted-host-smoke",
  "requestId": "00000000-0000-4000-8000-000000000001"
}
```

The request ID is a bounded UUIDv4 **correlation token only**, not a secret or signature. Any extra JSON keys are rejected. An `action` of `official-benchmark` is a recognized *denial case* that **never executes**, even if accompanied by a supposed approval. No other action is accepted.

### Operator-only usage

From a **detached QA checkout**, not the Production runtime, create a small local work order file outside the repository on the user's Windows machine:

```powershell
$ticket = Join-Path $env:TEMP "blackstar-cybergym-benign-work-order.json"
@{
    schema = "blackstar.cybergym.work-order.v1"
    action = "benign-trusted-host-smoke"
    requestId = [guid]::NewGuid().ToString()
} | ConvertTo-Json | Set-Content -Path $ticket -Encoding UTF8

node scripts/verification/cybergym-work-order-boundary.mjs --inspect $ticket
```

`--inspect` is **read-only** and never calls Ollama, Docker or a public endpoint. It should return `BENIGN_OPERATOR_ONLY_OFFICIAL_EXECUTION_BLOCKED`; this is **not** an execution grant.

Only after the owner explicitly decides to run another harmless smoke:

```powershell
node scripts/verification/cybergym-work-order-boundary.mjs --run-benign $ticket
```

That flag reuses the existing `runOwnerTrustedControllerBenign` sequence: verify Windows Docker/loopback topology, call pinned no-tool localhost Astra, then (if model succeeds) run exactly the existing bounded cached BusyBox fixture. No supplied commands, shells, model output, Docker flags, images, API URLs or approval properties become arguments to the executor. It does not start an HTTP/TCP listener, download assets, touch Production or run the official benchmark. The host operator invocation is not equivalent to authorising a future CyberGym security task.

Even a successful harmless job reports `BENIGN_HOST_CHECK_OBSERVED_OFFICIAL_EXECUTION_BLOCKED` with all official readiness/approval/attestation flags false.

## Fail-closed tests

```powershell
node --test scripts/verification/cybergym-work-order-boundary.test.mjs
```

Synthetic tests reject arbitrary actions, added approval/command/tool/provider/docker/image/mount fields, malformed IDs, arrays, extra keys, symlinks and oversized files. An official work order cannot invoke the bounded host runner. A mocked benign work order cannot turn self-reported vulnerable or attested outcomes into a PASS.

**Still blocked:** actual agent-to-controller work-order transport, existing Blackstar approval/audit integration, privately deployable official CyberGym server with reviewed Docker authority, official task dataset and image digests, real firewall and resource enforcement, explicit task-specific owner approval, vulnerable/fixed scoring and independent attestation.

Do **not** expose port 8666, bind Ollama to `0.0.0.0`, mount Docker socket into an untrusted container, use Cloudflare/Tailscale for the benchmark, merge draft QA branches or label these benign results as CyberGym execution success.
