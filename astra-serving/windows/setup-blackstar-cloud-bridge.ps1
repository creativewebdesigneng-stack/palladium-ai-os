param(
  [int]$ProxyPort = 12780,
  [string]$Model = "qwen3:8b-q4_K_M"
)

$ErrorActionPreference = "Stop"
$proxyScript = Join-Path $PSScriptRoot "blackstar-ollama-bearer-proxy.ps1"
$runtimeDir = Join-Path $env:LOCALAPPDATA "Blackstar\runtime"
New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null

function Resolve-CloudflaredPath {
  $cmd = Get-Command cloudflared -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $candidates = @(
    "$env:ProgramFiles\cloudflared\cloudflared.exe",
    "${env:ProgramFiles(x86)}\cloudflared\cloudflared.exe"
  )
  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path $candidate)) { return $candidate }
  }
  return $null
}

Write-Host "Blackstar cloud-to-home GPU bridge"
Write-Host "Model: $Model"

try {
  $models = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:11434/v1/models" -TimeoutSec 10
} catch {
  throw "Ollama is not reachable on 127.0.0.1:11434. Start Ollama and verify local inference first."
}
$modelIds = @($models.data | ForEach-Object { $_.id })
if ($modelIds -notcontains $Model) {
  throw "Ollama is running, but $Model was not returned by /v1/models."
}

$cloudflared = Resolve-CloudflaredPath
if (-not $cloudflared) {
  $winget = Get-Command winget -ErrorAction SilentlyContinue
  if (-not $winget) {
    throw "cloudflared is not installed and winget is unavailable. Install Cloudflare cloudflared, then rerun this script."
  }
  Write-Host "Installing Cloudflare cloudflared with winget..."
  & $winget.Source install --id Cloudflare.cloudflared --exact --accept-source-agreements --accept-package-agreements
  if ($LASTEXITCODE -ne 0) {
    throw "winget failed to install Cloudflare cloudflared."
  }
  $cloudflared = Resolve-CloudflaredPath
}
if (-not $cloudflared) {
  throw "cloudflared executable was not found after installation. Open a new PowerShell window and rerun this script."
}

# Windows PowerShell 5.1 runs on .NET Framework, where the static RandomNumberGenerator.Fill API is unavailable.
# Use the instance API so the same script works on Windows PowerShell 5.1 and modern PowerShell/.NET.
$random = New-Object byte[] 48
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try {
  $rng.GetBytes($random)
} finally {
  if ($rng) { $rng.Dispose() }
}
$token = [Convert]::ToBase64String($random).TrimEnd('=').Replace('+','-').Replace('/','_')
$env:BLACKSTAR_BRIDGE_TOKEN = $token

Write-Host "Starting localhost-only authenticated proxy..."
$proxy = Start-Process -FilePath "powershell.exe" -ArgumentList @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-File", ('"' + $proxyScript + '"'),
  "-Port", $ProxyPort
) -WindowStyle Hidden -PassThru

$proxyReady = $false
for ($i = 0; $i -lt 20; $i++) {
  Start-Sleep -Milliseconds 500
  try {
    $headers = @{ Authorization = "Bearer $token" }
    $probe = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:$ProxyPort/v1/models" -Headers $headers -TimeoutSec 3
    if (@($probe.data | ForEach-Object { $_.id }) -contains $Model) {
      $proxyReady = $true
      break
    }
  } catch {}
}
if (-not $proxyReady) {
  try { Stop-Process -Id $proxy.Id -Force -ErrorAction SilentlyContinue } catch {}
  throw "The Blackstar authenticated localhost proxy did not become ready."
}

$outLog = Join-Path $runtimeDir "cloudflared.out.log"
$errLog = Join-Path $runtimeDir "cloudflared.err.log"
Remove-Item $outLog,$errLog -Force -ErrorAction SilentlyContinue

Write-Host "Starting temporary Cloudflare TLS tunnel..."
$tunnel = Start-Process -FilePath $cloudflared -ArgumentList @(
  "tunnel",
  "--no-autoupdate",
  "--url", "http://127.0.0.1:$ProxyPort"
) -RedirectStandardOutput $outLog -RedirectStandardError $errLog -WindowStyle Hidden -PassThru

$tunnelUrl = $null
for ($i = 0; $i -lt 60; $i++) {
  Start-Sleep -Seconds 1
  $combined = ""
  if (Test-Path $outLog) { $combined += (Get-Content $outLog -Raw -ErrorAction SilentlyContinue) }
  if (Test-Path $errLog) { $combined += "`n" + (Get-Content $errLog -Raw -ErrorAction SilentlyContinue) }
  $match = [regex]::Match($combined, 'https://[a-z0-9-]+\.trycloudflare\.com', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  if ($match.Success) {
    $tunnelUrl = $match.Value.TrimEnd('/')
    break
  }
  if ($tunnel.HasExited) { break }
}

if (-not $tunnelUrl) {
  try { Stop-Process -Id $tunnel.Id -Force -ErrorAction SilentlyContinue } catch {}
  try { Stop-Process -Id $proxy.Id -Force -ErrorAction SilentlyContinue } catch {}
  $tail = ""
  if (Test-Path $errLog) { $tail = (Get-Content $errLog -Tail 20 -ErrorAction SilentlyContinue) -join "`n" }
  throw "Cloudflare tunnel did not publish a URL. $tail"
}

Write-Host "Verifying authenticated remote model discovery..."
$remoteHeaders = @{ Authorization = "Bearer $token" }
$remoteModels = Invoke-RestMethod -Method Get -Uri "$tunnelUrl/v1/models" -Headers $remoteHeaders -TimeoutSec 30
if (@($remoteModels.data | ForEach-Object { $_.id }) -notcontains $Model) {
  throw "The remote bridge is reachable, but the expected model identity was not returned."
}

@{
  proxy_pid = $proxy.Id
  tunnel_pid = $tunnel.Id
  proxy_port = $ProxyPort
  tunnel_url = $tunnelUrl
  started_at = (Get-Date).ToString("o")
} | ConvertTo-Json | Set-Content -Path (Join-Path $runtimeDir "bridge.json") -Encoding UTF8

Write-Host ""
Write-Host "Blackstar authenticated cloud bridge is operational." -ForegroundColor Green
Write-Host ""
Write-Host "Use these SERVER-ONLY deployment values:"
Write-Host "OPENAI_COMPATIBLE_BASE_URL=$tunnelUrl/v1"
Write-Host "OPENAI_COMPATIBLE_API_KEY=$token"
Write-Host "BLACKSTAR_NATIVE_MODEL=$Model"
Write-Host "BLACKSTAR_NATIVE_PRIMARY=true"
Write-Host ""
Write-Host "Security boundary: Ollama remains bound to localhost. The public tunnel reaches only a localhost bearer-auth proxy that permits GET /v1/models and POST /v1/chat/completions."
Write-Warning "This trycloudflare.com URL is a temporary development bridge, not the final production tunnel. Keep the bearer token secret. Closing or stopping the tunnel invalidates this route."
Write-Host "To stop the bridge: powershell -ExecutionPolicy Bypass -File .\astra-serving\windows\stop-blackstar-cloud-bridge.ps1"
