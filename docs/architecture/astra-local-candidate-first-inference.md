# Astra local candidate — first real inference gate

This is the **existing Blackstar compatible-model gateway**, not a new dispatcher or a trained proprietary model. The script verifies a local OpenAI-compatible model route on the operator's own PC without exposing the port or copying credentials.

## Windows PowerShell (from the Blackstar repository)

```powershell
cd "$HOME\palladium-ai-os"
git fetch origin
git switch feat/astra-core-verified-coordination-20261022
git pull --ff-only
node scripts/verification/astra-local-candidate-check.mjs
```

The first command only checks `http://127.0.0.1:11434/v1/models` (Ollama's compatible route). It prints the number of models, not their names or secrets. To see your model names locally, run `ollama list`. Copy one exact name from that output and use:

```powershell
node scripts/verification/astra-local-candidate-check.mjs --model "EXACT_MODEL_NAME" --probe --timeout-ms 120000
```

`--probe` is opt-in and sends exactly one small real chat request. A response with `inference: real_response_received`, `responseShapeValid: true`, and `upstreamModelIdentity: match` establishes that a local endpoint returned real text **and declared the exact requested model ID**. A missing or mismatched upstream `model` field is reported as `upstream_model_identity_missing` or `upstream_model_identity_mismatch` and does not count as verified inference. This declaration is not cryptographic evidence of model ownership or training provenance, nor does it establish remote reachability, evaluator independence or certification. If the model is not listed or cannot complete, do not claim success. Do not post API keys, worker tokens or private tunnel URLs.

If your local OpenAI-compatible bridge is listening on port 31415 rather than Ollama 11434, add `--base-url http://127.0.0.1:31415/v1`. Only loopback HTTP endpoints are accepted, and HTTP redirects are refused for both model listing and chat inference, preventing an apparently local service from redirecting the probe to a LAN or internet endpoint. The script does not configure or expose Tailscale Funnel, does not change Vercel, and never writes to Supabase.

## Remote Preview and certification gates

After a **real local pass**, separately provision an authenticated HTTPS reverse proxy with explicit domain/network restrictions and no direct public access to Ollama. Configure the existing Vercel Preview-compatible route and a **separate** authenticated independent evaluator (the existing FreeLLMAPI evaluator requires pinned provider/model response identity). Do not copy Production credentials into Preview. Do not use the same model to judge itself.

Provision an isolated Supabase branch only after confirming possible compute charges. Apply and test the pending Astra certification migration there, run one authorized benchmark case, and verify the actual persisted response, judge score, HMAC provenance and scoped attestation. The target is 20 real qualifying cases per task class, not a simulated success percentage.

For **trusted certification** (as opposed to the local connectivity diagnostic), the compatible gateway now requires the actual upstream `chat/completions` JSON response to contain a `model` string exactly matching the pinned candidate model ID. Missing or mismatched model IDs fail closed before response evidence is persisted; redirects are refused for both the main candidate call and authenticated route probes. This checks a provider's declared model identity, **not cryptographic proof of model weights, ownership or training origin**. A separate independent evaluator and signed persisted run are still required.

CI runs the diagnostic's unit tests; these mock HTTP to prove its safety boundaries. They do not replace a real inference test on the operator's PC.
