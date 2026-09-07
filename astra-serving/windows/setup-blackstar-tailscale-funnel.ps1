param(
  [int]$ProxyPort = 12780,
  [string]$Model = "qwen3:8b-q4_K_M"
)

$ErrorActionPreference = "Stop"
$proxyScript = Join-Path $PSScriptRoot "blackstar-ollama-bearer-proxy.ps1"
$runtimeDir = Join-Path $env:LOCALAPPDATA "Blackstar\runtime"
New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null

function Resolve-TailscalePath {
  $cmd = Get-Command tailscale -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $candidate = "$env:ProgramFiles\Tailscale\tailscale.exe"
  if (Test-Path $candidate) { return $candidate }
  return $null
}

function Get-FreeLoopbackPort {
  $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, 0)
  try {
    $listener.Start()
    return [int]$listener.LocalEndpoint.Port
  } finally {
    $listener.Stop()
  }
}

function Resolve-ProxyPort([int]$RequestedPort) {
  $listeners = @(Get-NetTCPConnection -LocalPort $RequestedPort -State Listen -ErrorAction SilentlyContinue)
  if ($listeners.Count -eq 0) { return $RequestedPort }

  foreach ($listener in $listeners) {
    $pidValue = [int]$listener.OwningProcess
    if (-not $pidValue) { continue }
    $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId=$pidValue" -ErrorAction SilentlyContinue
    $commandLine = if ($processInfo) { [string]$processInfo.CommandLine } else { "" }
    if ($commandLine -match "blackstar-ollama-bearer-proxy\.ps1") {
      Write-Host "Stopping stale Blackstar proxy process $pidValue..."
      Stop-Process -Id $pidValue -Force -ErrorAction SilentlyContinue
      Start-Sleep -Milliseconds 500
    }
  }

  $remaining = @(Get-NetTCPConnection -LocalPort $RequestedPort -State Listen -ErrorAction SilentlyContinue)
  if ($remaining.Count -eq 0) { return $RequestedPort }
  $fallbackPort = Get-FreeLoopbackPort
  Write-Host "Port $RequestedPort is occupied. Using free localhost proxy port $fallbackPort instead..."
  return $fallbackPort
}

Write-Host "Blackstar domainless cloud bridge (Tailscale Funnel)"
Write-Host "Model: $Model"

try {
  $models = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:11434/v1/models" -TimeoutSec 10
} catch {
  throw "Ollama is not reachable on 127.0.0.1:11434. Start Ollama first."
}
if (@($models.data | ForEach-Object { $_.id }) -notcontains $Model) {
  throw "Ollama is running, but $Model was not returned by /v1/models."
}

$tailscale = Resolve-TailscalePath
if (-not $tailscale) {
  $winget = Get-Command winget -ErrorAction SilentlyContinue
  if (-not $winget) {
    throw "Tailscale is not installed and winget is unavailable. Install Tailscale for Windows, sign in, then rerun this script."
  }
  Write-Host "Installing Tailscale with winget..."
  & $winget.Source install --id Tailscale.Tailscale --exact --accept-source-agreements --accept-package-agreements
  if ($LASTEXITCODE -ne 0) { throw "winget failed to install Tailscale." }
  $tailscale = Resolve-TailscalePath
}
if (-not $tailscale) {
  throw "Tailscale was installed but tailscale.exe was not found. Open a new PowerShell window and rerun this script."
}

$statusJson = & $tailscale status --json 2>$null
if ($LASTEXITCODE -ne 0 -or -not $statusJson) {
  throw "Tailscale is installed but not signed in. Open the Tailscale app, sign in once, then rerun this script."
}
$status = $statusJson | ConvertFrom-Json
if ([string]$status.BackendState -ne "Running") {
  throw "Tailscale is not connected (state: $($status.BackendState)). Open the Tailscale app and sign in/connect, then rerun this script."
}
$dnsName = [string]$status.Self.DNSName
if (-not $dnsName) {
  throw "Tailscale did not report a device DNS name. Ensure MagicDNS is enabled for the tailnet."
}
$dnsName = $dnsName.TrimEnd('.')

$ProxyPort = Resolve-ProxyPort -RequestedPort $ProxyPort

$random = New-Object byte[] 48
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng.GetBytes($random) } finally { if ($rng) { $rng.Dispose() } }
$token = [Convert]::ToBase64String($random).TrimEnd('=').Replace('+','-').Replace('/','_')
$env:BLACKSTAR_BRIDGE_TOKEN = $token

$proxy = $null
$bridgeReady = $false
try {
  Write-Host "Starting localhost-only authenticated proxy on port $ProxyPort..."
  $proxy = Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ('"' + $proxyScript + '"'), "-Port", $ProxyPort
  ) -WindowStyle Hidden -PassThru

  $proxyReady = $false
  for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Milliseconds 500
    try {
      $probe = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:$ProxyPort/v1/models" -Headers @{ Authorization = "Bearer $token" } -TimeoutSec 3
      if (@($probe.data | ForEach-Object { $_.id }) -contains $Model) { $proxyReady = $true; break }
    } catch {}
  }
  if (-not $proxyReady) { throw "The Blackstar authenticated localhost proxy did not become ready." }

  Write-Host "Publishing authenticated proxy through Tailscale Funnel..."
  $funnelOutput = & $tailscale funnel --bg --yes --https=443 "http://127.0.0.1:$ProxyPort" 2>&1
  if ($LASTEXITCODE -ne 0) {
    $message = ($funnelOutput | Out-String).Trim()
    throw "Tailscale Funnel could not be enabled. $message"
  }

  $publicBase = "https://$dnsName"
  Write-Host "Verifying authenticated remote model discovery at $publicBase..."
  $remoteModels = $null
  $lastError = $null
  for ($i = 0; $i -lt 30; $i++) {
    try {
      $remoteModels = Invoke-RestMethod -Method Get -Uri "$publicBase/v1/models" -Headers @{ Authorization = "Bearer $token" } -TimeoutSec 10
      if (@($remoteModels.data | ForEach-Object { $_.id }) -contains $Model) { $lastError = $null; break }
      $lastError = "remote endpoint did not return expected model identity"
    } catch {
      $lastError = $_.Exception.Message
    }
    Start-Sleep -Seconds 2
  }
  if (-not $remoteModels -or @($remoteModels.data | ForEach-Object { $_.id }) -notcontains $Model) {
    throw "The Tailscale Funnel route did not become ready. Last error: $lastError"
  }

  @{
    transport = "tailscale-funnel"
    proxy_pid = $proxy.Id
    proxy_port = $ProxyPort
    public_base_url = $publicBase
    started_at = (Get-Date).ToString("o")
  } | ConvertTo-Json | Set-Content -Path (Join-Path $runtimeDir "bridge.json") -Encoding UTF8

  $bridgeReady = $true
  Write-Host ""
  Write-Host "Blackstar authenticated Tailscale Funnel bridge is operational." -ForegroundColor Green
  Write-Host ""
  Write-Host "Use these SERVER-ONLY deployment values:"
  Write-Host "OPENAI_COMPATIBLE_BASE_URL=$publicBase/v1"
  Write-Host "OPENAI_COMPATIBLE_API_KEY=$token"
  Write-Host "BLACKSTAR_NATIVE_MODEL=$Model"
  Write-Host "BLACKSTAR_NATIVE_PRIMARY=true"
  Write-Host ""
  Write-Warning "Funnel is internet-accessible. Keep the bearer token secret. Ollama itself remains localhost-only; only the restricted bearer proxy is published."
} finally {
  if (-not $bridgeReady -and $proxy -and -not $proxy.HasExited) {
    Stop-Process -Id $proxy.Id -Force -ErrorAction SilentlyContinue
  }
}
