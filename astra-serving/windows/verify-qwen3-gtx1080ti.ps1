param(
  [string]$Model = "qwen3:8b-q4_K_M",
  [string]$BaseUrl = "http://127.0.0.1:11434"
)

$ErrorActionPreference = "Stop"
$OpenAiBaseUrl = "$BaseUrl/v1"
$Marker = "BLACKSTAR_GPU_OK"

function Fail([string]$Message) {
  Write-Host "FAIL: $Message" -ForegroundColor Red
  exit 1
}

Write-Host "Blackstar Qwen3 GTX 1080 Ti verification"
Write-Host "This script only talks to localhost. It does not call a paid API and it does not pull a model."

if ($BaseUrl -notmatch '^http://(127\.0\.0\.1|localhost)(:\d+)?$') {
  Fail "Refusing to verify a non-local endpoint. Keep Ollama on localhost."
}

$nvidia = Get-Command nvidia-smi -ErrorAction SilentlyContinue
if (-not $nvidia) {
  Fail "nvidia-smi was not found. Run this on the GPU machine."
}

$gpu = & $nvidia.Source --query-gpu=name,memory.total,compute_cap --format=csv,noheader
if ($LASTEXITCODE -ne 0 -or -not $gpu) {
  Fail "nvidia-smi could not report a GPU."
}
Write-Host "GPU: $gpu"
$gpuText = ($gpu | Out-String)
if ($gpuText -notmatch '1080') {
  Write-Warning "This GPU name is not a GTX 1080 Ti. The Qwen3 8B Q4 lane can still run, but the 11 GB Pascal notes may not apply."
}
if ($gpuText -match '(\d+)\s*MiB' -and [int]$Matches[1] -lt 8192) {
  Fail "Reported VRAM is below 8 GB. qwen3:8b-q4_K_M plus an 8192-token cache is unlikely to fit."
}
if ($gpuText -match ',\s*([0-9]+(?:\.[0-9]+)?)' -and [version]$Matches[1] -lt [version]'7.0') {
  Write-Host "Compute capability is below 7.0. Use Ollama. Do not use astra-serving/docker-compose.yml on this GPU."
}

try {
  Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/version" -TimeoutSec 5 | Out-Null
} catch {
  Fail "Ollama is not answering at $BaseUrl. Start it with OLLAMA_HOST=127.0.0.1:11434 and OLLAMA_CONTEXT_LENGTH=8192."
}

Write-Host "Checking model identity $Model"
$models = Invoke-RestMethod -Method Get -Uri "$OpenAiBaseUrl/models" -TimeoutSec 20
$modelIds = @($models.data | ForEach-Object { $_.id })
if ($modelIds -notcontains $Model) {
  Fail "$Model is not in GET /v1/models. Run astra-serving/windows/setup-blackstar-ollama.ps1 first. Do not expose port 11434."
}

$started = Get-Date
$body = @{
  model = $Model
  messages = @(@{ role = "user"; content = "Reply with exactly ${Marker} /no_think" })
  temperature = 0
  max_tokens = 512
} | ConvertTo-Json -Depth 6
try {
  $response = Invoke-RestMethod -Method Post -Uri "$OpenAiBaseUrl/chat/completions" -ContentType "application/json" -Body $body -TimeoutSec 180
} catch {
  Fail "The local chat completion request failed. Check that the model finished loading and that the context length is 8192."
}
$elapsed = [int]((Get-Date) - $started).TotalMilliseconds
$text = [string]$response.choices[0].message.content
$visible = [regex]::Replace($text, '(?is)<think>.*?</think>', '').Trim()
if (-not $visible) {
  Fail "The model returned no visible text after ${elapsed} ms. Thinking-only output is not a successful identity check."
}
if ($visible -notmatch '(^|[^A-Z0-9_])BLACKSTAR_GPU_OK([^A-Z0-9_]|$)') {
  Fail "The model answered, but the visible text did not contain $Marker. Response: $visible"
}

Write-Host "PASS in ${elapsed} ms" -ForegroundColor Green
Write-Host "Visible response: $visible"
Write-Host ""
Write-Host "Set these server-only values for a Blackstar process on this PC:"
Write-Host "OPENAI_COMPATIBLE_BASE_URL=$OpenAiBaseUrl"
Write-Host "BLACKSTAR_NATIVE_MODEL=$Model"
Write-Host "BLACKSTAR_NATIVE_PRIMARY=true"
Write-Host "BLACKSTAR_NATIVE_RUNTIME=ollama"
Write-Host "BLACKSTAR_NATIVE_NUM_CTX=8192"
Write-Host ""
Write-Host "Do not put these values in a VITE_ variable. Do not expose port 11434 to the internet."
Write-Host "A passing check shows the model is reachable. It does not create Model Arena evidence or grant tools."
exit 0
