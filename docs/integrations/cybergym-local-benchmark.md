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
