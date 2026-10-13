param()
# Run a real Chromium navigation/extraction acceptance test against the locally
# running worker. Credentials stay inside this PowerShell process and Node child.
$ErrorActionPreference = "Stop"
$runtimeDir = Join-Path $env:LOCALAPPDATA "Blackstar\browser-worker"
$tokenFile = Join-Path $runtimeDir "worker-token.clixml"
$processFile = Join-Path $runtimeDir "worker-process.json"
if (-not (Test-Path $tokenFile) -or -not (Test-Path $processFile)) {
  throw "The local worker hasn't been started. Run browser-worker\windows\start-local.ps1 first."
}
$record = Get-Content -Raw -Path $processFile | ConvertFrom-Json
$process = Get-Process -Id ([int]$record.pid) -ErrorAction SilentlyContinue
if (-not $process) { throw "The local browser-worker process is not running." }
$actualStart = $process.StartTime.ToUniversalTime()
$expectedStart = ([DateTimeOffset]::Parse([string]$record.startedUtc)).UtcDateTime
if ([math]::Abs(($actualStart - $expectedStart).TotalSeconds) -ge 2) {
  throw "The saved browser worker PID has been reused; no unverified service will be probed."
}
$port = [int]$record.port
if ($port -lt 1024 -or $port -gt 65535) { throw "Local browser-worker port is invalid." }
$secure = Import-Clixml -Path $tokenFile
if (-not ($secure -is [securestring])) { throw "The encrypted worker token is invalid." }
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
$oldEndpoint = $env:PLAYWRIGHT_BROWSER_ENDPOINT
$oldToken = $env:PLAYWRIGHT_BROWSER_TOKEN
try {
  $env:PLAYWRIGHT_BROWSER_ENDPOINT = "http://127.0.0.1:$port"
  $env:PLAYWRIGHT_BROWSER_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  if (-not $env:PLAYWRIGHT_BROWSER_TOKEN) { throw "The stored token was empty." }
  $workerDir = Split-Path -Parent $PSScriptRoot
  $smokeFile = Join-Path $workerDir "smoke.mjs"
  if (-not (Test-Path $smokeFile)) { throw "Blackstar smoke script is missing." }
  & node $smokeFile --local
  if ($LASTEXITCODE -ne 0) { throw "The real browser smoke test failed. See the safe diagnostic above." }
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  if ($null -eq $oldEndpoint) { Remove-Item Env:PLAYWRIGHT_BROWSER_ENDPOINT -ErrorAction SilentlyContinue }
  else { $env:PLAYWRIGHT_BROWSER_ENDPOINT = $oldEndpoint }
  if ($null -eq $oldToken) { Remove-Item Env:PLAYWRIGHT_BROWSER_TOKEN -ErrorAction SilentlyContinue }
  else { $env:PLAYWRIGHT_BROWSER_TOKEN = $oldToken }
}
