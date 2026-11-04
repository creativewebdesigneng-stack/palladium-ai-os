# CyberGym trusted controller — Windows private topology audit

**Scope:** Read-only owner-side observations supporting [Worker Mission #1050](https://github.com/creativewebdesigneng-stack/palladium-ai-os/issues/1050). This QA utility **does not** implement the privileged CyberGym submission server, a model relay, or an agent bridge. It must not be described as official benchmark readiness, proof of host firewall isolation, or permission to execute a vulnerable target.

Official upstream: [CyberGym README](https://github.com/sunblaze-ucb/cybergym), [FAQ](https://github.com/sunblaze-ucb/cybergym/blob/main/FAQ.md). The upstream guidance warns that `/submit-vul` executes uploaded proof-of-concept inputs; never expose the server publicly. On Docker Desktop for Windows/WSL2, the Docker bridge gateway may be inside Docker Desktop's Linux environment rather than assigned to Windows or the user's Ubuntu WSL distro.

## New read-only audit

Run from a QA-only Blackstar checkout on the owner Windows machine:

```powershell
node scripts/verification/cybergym-controller-topology.mjs --read-only
```

The script makes **no HTTP requests** (not even to Ollama). It does not start Docker containers, servers, tools or models. It reads only:
- Docker CLI context, Docker Engine metadata, the existing `cybergym-internal` network (which must be empty, internal and non-attachable), via a local Windows named pipe with no environment overrides.
- Windows TCP listeners only for 11434 and 8666, via `Get-NetTCPConnection`.
- Whether `Get-NetIPAddress` on Windows owns the network's observed private gateway IP.

Expected owner-reported topology from earlier manual checks: only `127.0.0.1:11434` listens on Windows, no Windows 8666 listener, and the Windows host does not own the internal gateway `172.18.0.1`. These are previous operator observations, **not results from this new script**.

A passing observation returns `WINDOWS_BOUNDARY_OBSERVED_BENCHMARK_BLOCKED`, with all checks true and `failed=[]`. This specifically means Windows loopback/no-listener boundaries *were observed*, NOT that a model response or benchmark evaluation occurred. Windows gateway ownership may be `false` and still be a valid observation; in that case a Windows-host server cannot be assumed to bind the gateway. Unsafe/missing values fail closed as `CONTROLLER_TOPOLOGY_BLOCKED` or an error. The tool has no `approval` or `run` option.

## Important architectural separation

- Trusted Windows controller -> Astra via existing `http://127.0.0.1:11434/v1`. A genuine operator-local model response was already observed, with model `qwen3:8b-q4_K_M`, normal stop and 100% Ollama GPU offload. Exact output was `READY.`, not literally `READY`; strict exact-match smoke acceptance remains unverified.
- Untrusted/agent container -> `cybergym-internal` only. Previous restricted BusyBox tests observed 8/8 benign confinement settings and benign same-network TCP success. **Those results do not confer privilege or validate actual vulnerable images.**
- Actual CyberGym submission server -> deployment namespace **TBD**. The official instructions bind to Docker gateway for containerized agents, but Windows and the separate Ubuntu WSL distro did not own the gateway in observed tests. Do not start a vulnerable server by binding to `0.0.0.0`, publishing `8666`, tunneling it, mounting Docker's privileged socket into an untrusted container, or making Ollama reachable from the target network.
- The agent-to-Astra path is **not proven**: earlier confined container probes to Docker gateway 11434 failed (as expected). A host-side trusted controller could perform model inference and dispatch bounded actions to an isolated container, but that workflow must be designed, explicitly reviewed, and independently tested for compliance with the official scoring harness. This audit does not implement it.

## Remaining gates

1. Explicitly review actual official harness Python server, task agent interface and Docker privileges. In particular determine how the server will safely control the Docker Engine without passing a socket to an untrusted container.
2. Select the smallest 1–3 allowed official subset tasks, pin full real dataset/harness commit SHAs, audit exact storage needed, and request permission before downloads. No official data has been staged in this QA work.
3. Build and independently test a private host-side controller interface, no public or LAN bindings, no unapproved agent tools. Separate server deployment and ingress enforcement must be confirmed in the real execution namespace.
4. Request separate, explicitly scoped approval naming vulnerable task IDs, images, time/CPU/RAM caps and official evaluation method before actually running vulnerable code.
5. Check upstream final-submission scoring (`vul_exit_code` and `fix_exit_code`) and independently attest private artifacts without publishing PoC payloads or granting Blackstar trust from self-reported metadata.

No merge, no Production changes, no public listener, no paid fallback, no cloud tunnel, no autonomous exploit execution.
