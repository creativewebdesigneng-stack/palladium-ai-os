param(
  [string]$Model = "qwen3:8b-q4_K_M",
  [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
$BaseUrl = "http://127.0.0.1:11434"
$OpenAiBaseUrl = "$BaseUrl/v1"

function Resolve-OllamaPath {
  $cmd = Get-Command ollama -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }

  $candidates = @(
    "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe",
    "$env:ProgramFiles\Ollama\ollama.exe"
  )
  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) { return $candidate }
  }
  return $null
}

function Test-OllamaApi {
  try {
    Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/version" -TimeoutSec 3 | Out-Null
    return $true
  } catch {
    return $false
  }
}

if ($env:OS -ne "Windows_NT") {
  throw "This bootstrap is intended for Windows. Use astra-serving/docker-compose.yml on Linux GPU hosts."
}

Write-Host "Blackstar local inference bootstrap"
Write-Host "Model: $Model"

$nvidia = Get-Command nvidia-smi -ErrorAction SilentlyContinue
if ($nvidia) {
  Write-Host "Detected NVIDIA GPU:"
  & $nvidia.Source --query-gpu=name,memory.total,driver_version --format=csv,noheader
} else {
  Write-Warning "nvidia-smi was not found. Ollama may still run, but GPU acceleration has not been verified."
}

$ollama = Resolve-OllamaPath
if (-not $ollama -and -not $SkipInstall) {
  $winget = Get-Command winget -ErrorAction SilentlyContinue
  if (-not $winget) {
    throw "Ollama is not installed and winget is unavailable. Install Ollama for Windows, then rerun this script."
  }
  Write-Host "Installing Ollama with winget..."
  & $winget.Source install --id Ollama.Ollama --exact --accept-source-agreements --accept-package-agreements
  $ollama = Resolve-OllamaPath
}

if (-not $ollama) {
  throw "Ollama executable was not found."
}

if (-not (Test-OllamaApi)) {
  Write-Host "Starting Ollama on localhost only..."
  $env:OLLAMA_HOST = "127.0.0.1:11434"
  Start-Process -FilePath $ollama -ArgumentList "serve" -WindowStyle Hidden
  $ready = $false
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    if (Test-OllamaApi) {
      $ready = $true
      break
    }
  }
  if (-not $ready) {
    throw "Ollama did not become ready at $BaseUrl."
  }
}

Write-Host "Pulling $Model..."
& $ollama pull $Model
if ($LASTEXITCODE -ne 0) {
  throw "Ollama failed to pull $Model."
}

Write-Host "Verifying OpenAI-compatible model discovery..."
$models = Invoke-RestMethod -Method Get -Uri "$OpenAiBaseUrl/models" -TimeoutSec 15
$modelIds = @($models.data | ForEach-Object { $_.id })
if ($modelIds -notcontains $Model) {
  throw "Ollama is running, but $Model was not returned by /v1/models."
}

Write-Host "Running a real inference smoke test..."
$body = @{
  model = $Model
  messages = @(@{ role = "user"; content = "Reply with exactly: BLACKSTAR_READY" })
  temperature = 0
  max_tokens = 32
} | ConvertTo-Json -Depth 6

$response = Invoke-RestMethod -Method Post -Uri "$OpenAiBaseUrl/chat/completions" -ContentType "application/json" -Body $body -TimeoutSec 120
$text = [string]$response.choices[0].message.content
if (-not $text.Trim()) {
  throw "The model returned an empty response."
}

Write-Host ""
Write-Host "Blackstar local inference is operational." -ForegroundColor Green
Write-Host "Provider endpoint: $OpenAiBaseUrl"
Write-Host "Model: $Model"
Write-Host "Smoke-test response: $($text.Trim())"
Write-Host ""
Write-Host "For a Blackstar process running on this same PC, use:"
Write-Host "OPENAI_COMPATIBLE_BASE_URL=$OpenAiBaseUrl"
Write-Host "BLACKSTAR_NATIVE_MODEL=$Model"
Write-Host "BLACKSTAR_NATIVE_PRIMARY=true"
Write-Host ""
Write-Host "Do not expose port 11434 directly to the public internet. Cloud-hosted Blackstar requires a separately secured authenticated TLS route to this machine."
