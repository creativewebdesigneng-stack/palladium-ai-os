# CyberGym official harness source audit — execution BLOCKED

**Mission:** [Blackstar worker #1050](https://github.com/creativewebdesigneng-stack/palladium-ai-os/issues/1050)  
**Scope:** Non-executable source inspection and architecture decisions only. No official CyberGym code, binaries, server, workload, dataset, privileged Docker access, ports or production changes introduced by this document.

## Sources inspected (upstream `sunblaze-ucb/cybergym` public main, 2026-11-03)

- [`src/cybergym/server/__main__.py`](https://github.com/sunblaze-ucb/cybergym/blob/main/src/cybergym/server/__main__.py), fetched blob SHA `735c68e1740d7756c236011c05cc53118929feac`.
- [`src/cybergym/server/server_utils.py`](https://github.com/sunblaze-ucb/cybergym/blob/main/src/cybergym/server/server_utils.py), fetched blob SHA `160d25812ba1e6ff4e21b6d8dbdd48ea9b455aaa`.
- [`src/cybergym/server/types.py`](https://github.com/sunblaze-ucb/cybergym/blob/main/src/cybergym/server/types.py), fetched blob SHA `def18aa580ca6f5d4cc60db993ac77f6b7f277d4`.
- [`scripts/server_data/download_subset.py`](https://github.com/sunblaze-ucb/cybergym/blob/main/scripts/server_data/download_subset.py), fetched blob SHA `81359ea1d7b6cb810bc8ee4ccded934840aeb93d`.
- Official [README](https://github.com/sunblaze-ucb/cybergym/blob/main/README.md), [FAQ](https://github.com/sunblaze-ucb/cybergym/blob/main/FAQ.md) and [SUBMISSION.md](https://github.com/sunblaze-ucb/cybergym/blob/main/SUBMISSION.md).

**IMPORTANT:** Blob SHAs above identify files, not a verified whole-repository checkout commit, official dataset commit, image digest or independent attestation. All those pins remain required before running any official task.

## Verified upstream implementation facts

1. In `server/__main__.py`, `public_router.post('/submit-vul')` accepts submitted files and runs `submit_poc(..., mode='vul')`. The public router **is not protected by the API-key dependency** used for `private_router`; a task checksum and agent identifier are checked. The FAQ explicitly warns that this endpoint can execute submitted PoCs, so **a key alone must not be considered sufficient protection**.
2. `private_router` protects `/submit-fix`, `/query-poc` and `/verify-agent-pocs` using `X-API-Key`. `server/types.py` ships a public placeholder key and needs a private locally supplied `CYBERGYM_API_KEY` for later deployment, but this still does not authorise public exposure.
3. `server_utils.py` uses `docker.from_env()` and the Docker client to create/start/remove target containers. Its `run_container` and `run_container_binary` use `network_mode='none'` and read-only file mounts for PoCs and relevant binaries. The reviewed container-create calls **do not explicitly request** `cap_drop=ALL`, `read_only=True`, `security_opt=['no-new-privileges']`, `mem_limit`, `nano_cpus`, `pids_limit` or a non-root user. These controls must not be inferred from the earlier *BusyBox* tests.
4. The official download-subset script enumerates **10** sample task IDs and pulls vulnerable and fixed images through `docker.from_env()`; there is no need to run it for this source audit. Full data download is explicitly out of scope.
5. Official FAQ requires an agent-selected **single final submission** and verification of both vulnerable and patched outcomes. The patched image must remain unavailable to the agent. Do not equate any successful probe or an untrusted offline report with official scoring.

## Owner-device observations (not independently attested)

- Windows Ollama only `127.0.0.1:11434`; no Windows listener `8666`.
- `cybergym-internal`: Docker Desktop internal/non-attachable bridge, gateway `172.18.0.1`, empty after tests.
- Windows and separate Ubuntu WSL distro do not own gateway `172.18.0.1`; Docker Desktop Linux VM interface ownership is inferred from topology, not independently observed.
- Previous owner-run `cybergym-benign-confinement.mjs` reported 8/8 true; same-network two-BusyBox TCP succeeded with zero containers afterwards. These tests used **harmless BusyBox**, not the official server or target images.
- Qwen3 `qwen3:8b-q4_K_M` actually served local `/v1/chat/completions`, with reported 100% GPU offload. Model-to-agent reachability was **not** established; gateway-to-Ollama port `11434` connection failed from the sandbox.

## Architectural decision — default deny

- **Keep Astra loopback-only and trusted-host controlled.** Do not put Ollama onto `0.0.0.0`, publish port `11434`, use Cloudflare/Tailscale or let target/agent containers call the native provider directly.
- **Keep Docker daemon access only with a trusted host-side controller.** Do not mount `/var/run/docker.sock`, Windows Docker Engine named pipe, or unrestricted Docker API into untrusted agent, proxy or submission-facing containers. Such access is effectively host-level privilege and invalidates the benign confinement model.
- **Do not start upstream `cybergym.server` yet.** Its documented recommended bind at the bridge gateway is incompatible with the currently observed Windows/Ubuntu namespace ownership. An isolated 'server container' might be reached on the bridge, but its Docker lifecycle requirements cannot be satisfied by simply giving that container a privileged socket. This needs explicit design and independent review.
- For a viable local-first approach, evaluate a **dedicated trusted Linux execution namespace/VM with its own locally scoped Docker daemon** and private bridge that supports the official server's gateway binding, while keeping the Windows GPU Ollama controller outside the challenge network. This is a design candidate, **not deployed**. Before selecting it, test host/VM interface ownership and host-controller-to-agent dispatch as harmless fixtures without production or target payloads.
- Reuse existing Blackstar Workforce, approvals, audit, model gateway and Universal Skills Registry. Do not build a second unreviewed agent/approval runtime.

## Blockers before running a real sample

1. Obtain full pinned official harness *commit* and dataset *commit*, image digests, individual task asset sizes, and bounded scratch storage. Do not infer these from file/blob SHAs or download the full dataset.
2. Independent secure architecture review: trusted Docker lifecycle controller + non-exposed PoC server, private ingress from agents only, explicit approval authority, no insecure Docker socket exposure, real workload defaults for CPU/RAM/PIDs/caps/filesystems/mounts/patch-image access, and testable egress deny policy.
3. Demonstrate benign end-to-end controller/model/agent transport without connecting vulnerable containers to Windows Ollama. A private same-network BusyBox TCP check alone is insufficient.
4. Securely stage only specifically approved official sample assets; obtain separate explicit operator approval of task IDs, Docker images, duration/resource ceilings and permitted execution before any vulnerable run.
5. Record one final selected PoC plus genuine upstream vulnerable and patched exit codes, source/image digests and independently reviewed artifacts. Keep Blackstar evidence trust `UNVERIFIED` until attested.

**Status: SOURCE_AUDIT_COMPLETE / EXECUTION_BLOCKED.** This audit discovered a privileged lifecycle/server surface; it does not provide a runnable solution and no vulnerable code has run.
