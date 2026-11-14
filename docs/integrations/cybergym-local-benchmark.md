# CyberGym → Blackstar Astra: local-only evaluation bridge (phase 1)

**Status:** Offline evidence contract implemented. A real CyberGym benchmark run, independent attestation, Astra model training, and production integration have **not** been demonstrated.

Official upstream: https://github.com/sunblaze-ucb/cybergym  
Official submission guidance: https://github.com/sunblaze-ucb/cybergym/blob/main/SUBMISSION.md

CyberGym is an external benchmark, **not** a new Blackstar agent runtime, privileged tool, MCP connector, or training engine. Keep the existing Blackstar agent, approval, model-gateway, evaluation provenance, audit and Mission Control systems; do not duplicate them.

## Safety and hardware boundaries

- **Local only.** Run the official Python/Docker harness in a separate, isolated workstation environment. The upstream project warns never to expose the CyberGym server to the public internet. No Cloudflare or Tailscale tunnel, Vercel endpoint, public IP, or production Blackstar browser-worker connection.
- **Authorised only.** Require explicit consent for each benchmark session. Keep vulnerable images, PoCs, test files and credentials outside Blackstar's repository, live database, logs and UI. Default-deny container egress after required upstream assets are staged; enforce resource caps and minimal mounts.
- **Native model only.** Future agent adapter should use Blackstar's existing locally hosted Astra-compatible model (for example `qwen3:8b-q4_K_M`) through a locally secured route, not Groq/paid model fallbacks or a public dev tunnel.
- **Small subset first.** The upstream benchmark dataset is roughly 240 GB and complete execution data is much larger. Check free storage and local Docker configuration on the Windows/GPU workstation before downloading; do not download the full benchmark in CI.
- **No implicit trust.** The bridge neither runs vulnerable code nor contacts a server or database. Importing a JSON file never grants tools, approves an action, signs a certificate, or certifies Astra. No raw exploit or proof-of-concept content goes in report JSON.

## Phase 1 — import local evaluator metadata

After **genuine** official-harness runs and manual review of upstream outcomes, prepare a metadata-only JSON file. Record full dataset/harness Git commit SHAs and the actual exit codes. The `outcome` is operator-reported; this adapter does not infer official success from exit codes.

Example shape below is **illustrative and not benchmark evidence**:

```json
{
  "schema": "blackstar.cybergym.offline-report.v1",
  "benchmark": "cybergym",
  "datasetCommit": "<full-40-character-dataset-commit-sha>",
  "harnessCommit": "<full-40-character-harness-commit-sha>",
  "agent": "Blackstar Astra",
  "provider": "compatible",
  "model": "qwen3:8b-q4_K_M",
  "environment": "isolated-local",
  "taskResults": [
    {
      "taskId": "arvo:47101",
      "outcome": "blocked",
      "vulExitCode": null,
      "fixExitCode": null
    }
  ]
}
```

Supported outcomes: `reported_solved`, `reported_unsolved`, `blocked`. Solved reports require both `vulExitCode` and `fixExitCode` taken from upstream; `artifactSha256` is optional metadata. Hashes do not prove that artifacts exist. Never include credentials, traces, generated inputs, vulnerable programs or PoCs.

Execute from Blackstar repository root on the local workstation:

```powershell
node scripts/verification/cybergym-evidence.mjs M:\Blackstar\cybergym\run-metadata.json
node --test scripts/verification/cybergym-evidence.test.mjs
```

The output is sanitised, normalized, deterministic JSON containing task IDs, exit codes, candidate identity, pinning revisions, subset counts, coverage of the original **1,507-task** suite and a comparison checksum.

**Critical:** Output `trust` is always `UNVERIFIED`, `independentlyAttested` is always `false`, `officialLeaderboardEligible` is always `false`. The checksum is **not** an attestation or cryptographic signature. It must never be inserted into the existing Astra trusted-certification tables as proof of an independent run.

## Gates still required (NOT implemented in phase 1)

1. **G1: Local sandbox/runner.** Pin official upstream revisions. Isolate Docker networking and filesystem, enforce budgets and approval, and implement a bounded local Astra adapter. Never expose a CyberGym target as an ordinary agent tool.
2. **G2: Real benchmark acceptance.** Run a bounded official subset, compare with authoritative upstream scoring (both exit codes), preserve private source artifacts, record cost/latency/tokens, and report PASS/FAIL/BLOCKED honestly.
3. **G3: Independent attestation.** Verify immutable source evidence and signatures, then integrate with **existing** Blackstar evaluator, audit, and certification provenance. Self-reported imports remain untrusted.
4. **G4: Owner-scoped product workflow.** Add an authenticated evaluation dashboard, authorised job queue and results tracking without exposing vulnerable code. Never auto-merge model-generated security patches.
5. **G5: CyberGym-E2E.** Design a separately identified E2E suite for discovery-and-patch testing, not falsely labelled as the original reproduction benchmark.

Measure scoped subset performance, coverage, blocked cases, evidence validity, inference time, resource use and cost; do not call this model retraining, a cybersecurity certification or a demonstration of model superiority.


## Phase 2 read-only local safety preflight (QA branch)

The preflight verifier is available at `scripts/verification/cybergym-preflight.mjs`.
It does **not** download, build or execute vulnerable workloads; does not
launch Docker, invoke Astra, contact Supabase or grant any approval.
Its purpose is to catch obviously unsafe plans before any benchmark runner exists.

The official upstream project documents a ten-task sample, and warns **never**
to expose the vulnerable PoC server to the public Internet. A server listening
on `0.0.0.0`, or via Blackstar's existing external bridge, is forbidden.
The server bind address must equal the *observed* Docker internal network
gateway (not a guessed static address). This supports the upstream container
networking model while still requiring a separate host-firewall audit.

**Operator-only, read-only steps on Windows/PowerShell:**

1. Check that local Docker Desktop is operational, and inspect an existing
   `cybergym-internal` isolated network:

   ```powershell
   docker network inspect cybergym-internal
   ```

   If it does not exist, the preflight is **BLOCKED**. Creating the isolated
   network is a separate reviewed setup step; the preflight never does so.

2. Create a private local JSON file outside the repository (no API key):
   ```json
   {
     "schema": "blackstar.cybergym.preflight.v1",
     "datasetCommit": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
     "harnessCommit": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
     "taskIds": ["arvo:47101"],
     "nativeModel": {
       "provider": "compatible",
       "model": "qwen3:8b-q4_K_M",
       "baseUrl": "http://127.0.0.1:11434/v1"
     },
     "network": {
       "name": "cybergym-internal",
       "serverBindHost": "172.21.0.1",
       "serverPort": 8666,
       "allowPublicIngress": false,
       "allowDirectEgress": false
     },
     "limits": {
       "maxTaskDurationSeconds": 300,
       "maxMemoryMiB": 2048,
       "maxCpus": 2
     }
   }
   ```

   The Git SHA values and the Docker gateway above are **placeholders**, not
   discovered facts. Replace them only with real checked-out full revision
   hashes and the gateway reported by the local Docker network inspection.
   No full dataset download is implied or approved.

3. Run the preflight against the local JSON file:

   ```powershell
   node scripts/verification/cybergym-preflight.mjs M:\Blackstar\cybergym\preflight.json
   node --test scripts/verification/cybergym-preflight.test.mjs
   ```

A structurally safe configuration with a genuinely isolated, empty Docker
network reports `PLAN_VALIDATED_EXECUTION_BLOCKED`, not PASS for execution.
A missing Docker daemon/network, an unsafe bind, an unapproved remote model,
unknown task, excessive requested limit, public ingress, or non-isolated network
is rejected. This check does not attest that the manifest's proposed limits
are enforced on any future container.

**Outstanding operator/worker gates:** explicit authorisation; real
firewall/listener check from outside the host; Docker container mounts,
privileges, egress and cgroup limit verification; a model bridge that remains
private while reachable from isolated agent containers; actual native model
response identity; official upstream scoring; independent evidence attestation.
The host-local Ollama endpoint is **not automatically reachable** from an
isolated Docker container. Do not solve that by opening a public tunnel.

The read-only preflight and its tests can run in GitHub CI with mocked Docker
inspection objects. **That CI result is a unit-test result only**, not evidence
of a real isolated CyberGym deployment on the owner's Windows workstation.


## Phase 2: explicit localhost Astra model smoke (not CyberGym execution)

An additional opt-in local script checks **actual model readiness** without
touching any vulnerable target, remote provider, private reasoning, approval
workflow, production database or Blackstar application endpoint:

```powershell
# On the Windows PC hosting local Ollama/Astra, from the Blackstar repo root:
node scripts/verification/cybergym-native-smoke.mjs M:\Blackstar\cybergym\preflight.json
```

The JSON file is the same preflight plan described above. Use the **real** source
SHAs and actual selected local model endpoint. This script makes exactly two
bounded requests to `127.0.0.1` on the specified explicit port:
`GET /v1/models` and `POST /v1/chat/completions`. The POST sends a
small fixed no-tool/no-memory `/no_think` prompt and expects the literal
response `READY` from `qwen3:8b-q4_K_M`, finished normally. It does not
send credentials, use network proxies, follow redirects, fetch any web page or
try another model. If any response, identity or route is invalid, the check
**fails**, and no benchmark starts.

A real successful local result reports
`LOCAL_MODEL_SMOKE_PASSED_BENCHMARK_BLOCKED` with elapsed times;
`gpuExecutionVerified`, `benchmarkExecuted` and
`independentlyAttested` remain false. Confirm hardware separately using a
local GPU utilisation check; a localhost model response alone cannot prove it
ran on the GTX 1080 Ti.

**Important:** The GitHub CI tests exercise the same client against a synthetic
loopback HTTP fixture (including refusal/redirect/fallback cases). Passing
those tests is **not** evidence of real Astra inference on the owner's PC.
The command above is operator-initiated and will consume local inference
compute, but never execute a vulnerability challenge or request security
tool permissions. A model smoke success **does not** grant CyberGym
execution approval. Keep actual sample evaluation blocked until every
isolation, authority and resource gate is verified.
