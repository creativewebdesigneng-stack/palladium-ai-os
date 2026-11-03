# Blackstar CyberGym — benign confinement evidence only

This QA-stage probe supports Worker Mission #1050 and **does not** run official CyberGym tasks, install dependencies, fetch datasets, call model APIs, start submission listeners, certify isolation, or grant execution approvals.

## Current owner-reported preliminary evidence (2026-11-03)

- Host diagnostic: all 10/10 prerequisites observed on Windows; NVIDIA GTX 1080 Ti 11 GiB, 15 GiB RAM, 378 GiB free on local M:; Docker Desktop local Linux Engine.
- Network: `cybergym-internal` is an internal, non-attachable Docker bridge; private gateway observed `172.18.0.1`; empty after each temporary benign test.
- Astra: `qwen3:8b-q4_K_M` locally installed, `ollama ps` showed 100% GPU, real loopback `/v1/chat/completions` returned `READY.`, normal stop, 127 tokens. The exact-match test expected `READY`, therefore **exact-string acceptance is not proven**.
- Benign BusyBox test: no default IPv4/IPv6 route, failed outbound TCP connect to `1.1.1.1:443` and failed gateway port checks to `11434` and `8666` **at the times tested**. These negative connects do not prove complete isolation; service absence also explains a failed connection.
- Non-root UID 65534; CapEff and CapBnd zero; NoNewPrivs=1; Seccomp=2. Read-only-root command returned exit 0 but its explicit mount flags were not pasted, so direct read-only-root evidence is outstanding.

These are operator-reported live observations, not independent attestation or official scoring.

## Repeatable benign test (operator opt-in)

Use the existing detached Windows QA worktree, after fetching this separate QA branch into a **new** detached worktree; do not replace or reset any existing branch. The BusyBox 1.37.0 image must already be cached. This command creates exactly one bounded benign container and removes it automatically:

```powershell
node scripts/verification/cybergym-benign-confinement.mjs --benign-container-check
```

The script checks the local Docker Windows named pipe and empty `cybergym-internal` network before starting, runs the cached image by its local image ID with `--pull=never`, `--rm`, no host mounts, no published ports, non-root user, read-only root, no effective capabilities, no new privileges, PID/memory/CPU bounds and seccomp (observed). It parses IPv4/IPv6 routes, privileges and root mount options and verifies the network is empty after cleanup. Errors or ambiguous outputs **block** the result.

A passing output is `BENIGN_CONFINEMENT_OBSERVED_EXECUTION_BLOCKED`, **not** permission to execute vulnerable workloads. This tool does not perform active egress tests or verify image publisher provenance.

## Outstanding official evaluation gates

1. Obtain actual official CyberGym harness and dataset full commit hashes and select only 1–3 IDs from the existing official 10-task sample, without bulk downloads. Full dataset is approximately 240 GB; full server data is far larger. Confirm per-task storage and locally available disk *before* requesting a subset download.
2. Independent security review of the *actual* benchmark submission-server listener and ingress/firewall rules, especially inside Docker Desktop/WSL namespaces. The official submission server executes uploaded PoCs; **never expose it publicly**. Bind only to the observed internal Docker gateway after approval and test private reachability; no port forwarding, Cloudflare or Tailscale.
3. Independent review of image provenance, host mounts, actual workload privileges and resource limits, prohibited access to patched images and reference PoCs, network policy and whether the agent can reach the local model endpoint safely. The present benign failure to reach gateway port 11434 is **not** a working agent-to-model path.
4. Obtain separate explicit operator approval stating the exact vulnerable task(s), image/source revisions, bounded resources and duration **before** launching any vulnerable execution.
5. Verify one agent-selected final PoC via the official vulnerable and fixed exit codes, source and artifact provenance, token/time accounting and independent review; keep all resulting claims `UNVERIFIED` in Blackstar until independently established.

Official guidance: https://github.com/sunblaze-ucb/cybergym (README, FAQ.md and SUBMISSION.md). Do not merge this QA PR or change Production during preparation.
