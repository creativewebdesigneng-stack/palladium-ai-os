$ErrorActionPreference = "Stop"
$statePath = Join-Path $env:LOCALAPPDATA "Blackstar\runtime\bridge.json"
if (-not (Test-Path $statePath)) {
  Write-Host "No Blackstar cloud bridge state file was found."
  exit 0
}

$state = Get-Content $statePath -Raw | ConvertFrom-Json
if ([string]$state.transport -eq "tailscale-funnel") {
  $tailscale = Get-Command tailscale -ErrorAction SilentlyContinue
  if (-not $tailscale) {
    $candidate = "$env:ProgramFiles\Tailscale\tailscale.exe"
    if (Test-Path $candidate) { $tailscale = Get-Item $candidate }
  }
  if ($tailscale) {
    try { & $tailscale.Source funnel reset | Out-Null } catch {}
  }
}

foreach ($pidValue in @($state.tunnel_pid, $state.proxy_pid)) {
  if ($pidValue) {
    try {
      Stop-Process -Id ([int]$pidValue) -Force -ErrorAction Stop
    } catch {
      if ($_.Exception.Message -notmatch "Cannot find a process") { throw }
    }
  }
}
Remove-Item $statePath -Force -ErrorAction SilentlyContinue
Write-Host "Blackstar cloud bridge stopped. Ollama remains localhost-only."
