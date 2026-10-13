param()
# Stop only the exact PID and start time recorded by start-local.ps1.
# Does not reset any Tailscale Funnel configuration or delete credentials.
$ErrorActionPreference = "Stop"
$runtimeDir = Join-Path $env:LOCALAPPDATA "Blackstar\browser-worker"
$processFile = Join-Path $runtimeDir "worker-process.json"
if (-not (Test-Path $processFile)) {
  Write-Host "No local Blackstar browser-worker process record was found."
  exit 0
}
$record = Get-Content -Raw -Path $processFile | ConvertFrom-Json
$target = Get-Process -Id ([int]$record.pid) -ErrorAction SilentlyContinue
if (-not $target) {
  Remove-Item -Path $processFile -Force
  Write-Host "The recorded worker is no longer running; stale process record cleared."
  exit 0
}
$recordedStart = ([datetime]$record.startedUtc).ToUniversalTime()
$currentStart = $target.StartTime.ToUniversalTime()
if ([math]::Abs(($currentStart - $recordedStart).TotalSeconds) -ge 2) {
  throw "PID has been reused; refusing to stop an unrelated process. Remove the stale worker-process.json manually after checking."
}
Stop-Process -Id ([int]$record.pid) -ErrorAction Stop
Start-Sleep -Milliseconds 500
Remove-Item -Path $processFile -Force
Write-Host "Local Blackstar browser-worker process stopped."
Write-Host "If you separately enabled a public tunnel, disable its specific browser HTTPS port first; this script never resets other services."
