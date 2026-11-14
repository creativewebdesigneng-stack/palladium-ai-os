#!/usr/bin/env bash
# Local-only check for Qwen3 8B Q4_K_M. No paid API calls and no model download.
set -euo pipefail

MODEL="${BLACKSTAR_NATIVE_MODEL:-qwen3:8b-q4_K_M}"
BASE_URL="${OLLAMA_BASE_URL:-http://127.0.0.1:11434}"
MARKER="BLACKSTAR_GPU_OK"

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

printf 'Blackstar Qwen3 GTX 1080 Ti verification\n'
printf 'This script only talks to localhost. It does not call a paid API and it does not pull a model.\n'

case "$BASE_URL" in
  http://127.0.0.1:11434|http://127.0.0.1|http://localhost:11434|http://localhost) ;;
  *) fail "Refusing to verify a non-local endpoint. Keep Ollama on localhost." ;;
esac

command -v nvidia-smi >/dev/null 2>&1 || fail "nvidia-smi was not found. Run this on the GPU machine."
command -v curl >/dev/null 2>&1 || fail "curl is required."
command -v python3 >/dev/null 2>&1 || fail "python3 is required to read the JSON response."

gpu="$(nvidia-smi --query-gpu=name,memory.total,compute_cap --format=csv,noheader)" || fail "nvidia-smi could not report a GPU."
printf 'GPU: %s\n' "$gpu"
printf '%s\n' "$gpu" | grep -qi '1080' || printf 'WARNING: GPU name is not a GTX 1080 Ti. The 11 GB Pascal notes may not apply.\n' >&2
mib="$(printf '%s\n' "$gpu" | sed -n 's/.*[[:space:]]\([0-9][0-9]*\)[[:space:]]*MiB.*/\1/p' | head -n 1)"
if [[ -n "${mib}" && "${mib}" -lt 8192 ]]; then
  fail "Reported VRAM is below 8 GB. qwen3:8b-q4_K_M plus an 8192-token cache is unlikely to fit."
fi
cap="$(printf '%s\n' "$gpu" | awk -F',' '{gsub(/ /,"",$3); print $3}' | head -n 1)"
case "$cap" in
  6.*|5.*|3.*|2.*) printf 'Compute capability %s is below 7.0. Use Ollama. Do not use astra-serving/docker-compose.yml on this GPU.\n' "$cap" ;;
esac

curl -fsS --max-time 5 "$BASE_URL/api/version" >/dev/null || fail "Ollama is not answering at $BASE_URL. Start it with OLLAMA_HOST=127.0.0.1:11434 and OLLAMA_CONTEXT_LENGTH=8192."

printf 'Checking model identity %s\n' "$MODEL"
models="$(curl -fsS --max-time 20 "$BASE_URL/v1/models")" || fail "GET /v1/models failed."
printf '%s' "$models" | python3 -c 'import json,sys
model=sys.argv[1]
payload=json.load(sys.stdin)
ids=[item.get("id","") for item in payload.get("data",[]) if isinstance(item, dict)]
raise SystemExit(0 if model in ids else 1)' "$MODEL" \
  || fail "$MODEL is not in GET /v1/models. Pull it with the Ollama setup first. Do not expose port 11434."

payload="$(python3 -c 'import json,sys; print(json.dumps({"model": sys.argv[1], "messages": [{"role": "user", "content": "Reply with exactly " + sys.argv[2] + " /no_think"}], "temperature": 0, "max_tokens": 512}))' "$MODEL" "$MARKER")"

started="$(python3 -c 'import time; print(int(time.time()*1000))')"
response="$(curl -fsS --max-time 180 -H 'Content-Type: application/json' -d "$payload" "$BASE_URL/v1/chat/completions")" || fail "The local chat completion request failed."
ended="$(python3 -c 'import time; print(int(time.time()*1000))')"
elapsed="$((ended - started))"

printf '%s' "$response" | ELAPSED="$elapsed" MARKER="$MARKER" python3 -c 'import json,os,re,sys
marker=os.environ["MARKER"]
elapsed=os.environ["ELAPSED"]
payload=json.load(sys.stdin)
text=((payload.get("choices") or [{}])[0].get("message") or {}).get("content") or ""
visible=re.sub(r"(?is)<think>.*?</think>", "", text).strip()
if not visible:
    raise SystemExit(f"empty visible text after {elapsed} ms")
if not re.search(rf"(^|[^A-Z0-9_]){re.escape(marker)}([^A-Z0-9_]|$)", visible):
    raise SystemExit(visible)
print(f"PASS in {elapsed} ms")
print(f"Visible response: {visible}")' || fail "The visible reply did not contain $MARKER."

cat <<EOF

Set these server-only values for a Blackstar process on this machine:
OPENAI_COMPATIBLE_BASE_URL=$BASE_URL/v1
BLACKSTAR_NATIVE_MODEL=$MODEL
BLACKSTAR_NATIVE_PRIMARY=true
BLACKSTAR_NATIVE_RUNTIME=ollama
BLACKSTAR_NATIVE_NUM_CTX=8192

Do not put these values in a VITE_ variable. Do not expose port 11434 to the internet.
A passing check shows the model is reachable. It does not create Model Arena evidence or grant tools.
EOF
