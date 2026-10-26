$ErrorActionPreference = "Stop"
$runtimeDir = Join-Path $env:LOCALAPPDATA "Blackstar\runtime"
$statePath = Join-Path $runtimeDir "bridge.json"
if (-not (Test-Path $statePath)) {
  Write-Host "No Blackstar cloud bridge state file was found."
  exit 0
}

$state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
$transport = [string]$state.transport
# Funnel reset is machine-wide and could disable an unrelated browser worker.
# Never use a global Funnel reset to stop a model bridge.
if ($transport -eq "tailscale-funnel") {
  throw "Refusing to reset Tailscale Funnel: another browser-worker route may share it. Inspect the exact Funnel mapping before manually retiring this model bridge. No processes, state or credentials were changed."
}
if ($transport -and $transport -ne "cloudflare-quick-tunnel") {
  throw "Unknown Blackstar bridge transport '$transport'. No processes, state or credentials were changed."
}
if (-not $transport -and -not $state.tunnel_pid) {
  throw "Legacy bridge state has no recorded Cloudflare tunnel PID. Refusing to modify it."
}

$proxyPid = [int]$state.proxy_pid
$tunnelPid = [int]$state.tunnel_pid
$proxyPort = [int]$state.proxy_port
if ($proxyPid -le 0 -or $tunnelPid -le 0 -or $proxyPort -le 0) {
  throw "Incomplete Cloudflare bridge state; refusing to stop unknown processes."
}
if ($proxyPid -eq $tunnelPid) {
  throw "Invalid bridge state: tunnel and proxy process IDs are identical."
}

# Check both PIDs before stopping either one. Windows reuses process IDs, so
# the mere existence of a PID is not evidence it is still our model bridge.
$proxyProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$proxyPid" -ErrorAction SilentlyContinue
$tunnelProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$tunnelPid" -ErrorAction SilentlyContinue
if ($proxyProcess -and ([string]$proxyProcess.CommandLine -notmatch "blackstar-ollama-bearer-proxy\.ps1")) {
  throw "Recorded proxy PID $proxyPid does not belong to the Blackstar bearer proxy. No processes were stopped."
}
if ($tunnelProcess) {
  $tunnelName = [string]$tunnelProcess.Name
  $tunnelCommand = [string]$tunnelProcess.CommandLine
  if ($tunnelName -ine "cloudflared.exe" -or $tunnelCommand -notmatch ("127\.0\.0\.1:" + $proxyPort + "\b")) {
    throw "Recorded tunnel PID $tunnelPid does not match this Cloudflare model proxy. No processes were stopped."
  }
}

foreach ($pidValue in @($tunnelPid, $proxyPid)) {
  $existing = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
  if ($existing) { Stop-Process -Id $pidValue -Force -ErrorAction Stop }
}
Remove-Item -LiteralPath $statePath -Force -ErrorAction Stop
$tokenPath = Join-Path $runtimeDir "bridge-token.clixml"
Remove-Item -LiteralPath $tokenPath -Force -ErrorAction SilentlyContinue
Write-Host "Blackstar Cloudflare model bridge stopped. Ollama and Tailscale Funnel were not changed."
