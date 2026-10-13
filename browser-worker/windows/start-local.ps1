param(
  [ValidateRange(1024,65535)][int]$Port = 8787,
  [switch]$SkipDependencyInstall,
  [switch]$RotateToken
)
# Uses the EXISTING Blackstar browser worker; no public tunnel or Vercel change.
$ErrorActionPreference = "Stop"
$workerDir = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $env:LOCALAPPDATA "Blackstar\browser-worker"
$tokenFile = Join-Path $runtimeDir "worker-token.clixml"
$processFile = Join-Path $runtimeDir "worker-process.json"
$stdoutFile = Join-Path $runtimeDir "worker.stdout.log"
$stderrFile = Join-Path $runtimeDir "worker.stderr.log"
New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null

function Save-WorkerToken([string]$value) {
  ConvertTo-SecureString $value -AsPlainText -Force | Export-Clixml -Path $tokenFile
  $acl = Get-Acl -Path $tokenFile
  $acl.SetAccessRuleProtection($true, $false)
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
  $rule = New-Object Security.AccessControl.FileSystemAccessRule(
    $identity, [Security.AccessControl.FileSystemRights]::FullControl,
    [Security.AccessControl.AccessControlType]::Allow
  )
  $acl.SetAccessRule($rule)
  Set-Acl -Path $tokenFile -AclObject $acl
}
function Read-WorkerToken {
  if (-not (Test-Path $tokenFile)) { return $null }
  $secure = Import-Clixml -Path $tokenFile
  if (-not ($secure -is [securestring])) { throw "Stored worker token was not encrypted as a secure string." }
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}
if (Test-Path $processFile) {
  try {
    $previous = Get-Content -Raw -Path $processFile | ConvertFrom-Json
    $existing = Get-Process -Id ([int]$previous.pid) -ErrorAction SilentlyContinue
    if ($existing -and [math]::Abs(($existing.StartTime.ToUniversalTime() - ([DateTimeOffset]::Parse([string]$previous.startedUtc)).UtcDateTime).TotalSeconds) -lt 2) {
      throw "Blackstar browser worker already running (PID $($previous.pid)). Stop it before restarting."
    }
  } catch {
    if ($_.Exception.Message -match "already running") { throw }
  }
}
foreach ($binary in @("node","npm","npx")) {
  if (-not (Get-Command $binary -ErrorAction SilentlyContinue)) {
    throw "Missing $binary. Install Node.js LTS for Windows and reopen PowerShell."
  }
}
$node = (Get-Command node).Source
$major = [int](([string](& $node -p "process.versions.node")).Split(".")[0])
if ($major -lt 20) { throw "Node.js 20 or newer is required." }
if (-not (Test-Path (Join-Path $workerDir "server.mjs"))) { throw "Blackstar browser-worker source files are missing." }
$listeners = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
if ($listeners.Count -gt 0) { throw "Port $Port is already in use. Choose another port; no processes were stopped." }

if (-not $SkipDependencyInstall) {
  Write-Host "Installing Playwright dependencies and Chromium on this PC..."
  Push-Location $workerDir
  try {
    & npm install --omit=dev --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw "npm install failed." }
    & npx playwright install chromium
    if ($LASTEXITCODE -ne 0) { throw "Chromium installation failed." }
  } finally { Pop-Location }
} elseif (-not (Test-Path (Join-Path $workerDir "node_modules\playwright"))) {
  throw "Playwright was not installed. Rerun without -SkipDependencyInstall."
}

$token = if ($RotateToken) { $null } else { Read-WorkerToken }
if (-not $token) {
  $random = New-Object byte[] 48
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($random) } finally { $rng.Dispose() }
  $token = [Convert]::ToBase64String($random).TrimEnd("=").Replace("+","-").Replace("/","_")
  Save-WorkerToken $token
}
$prior = @{
  Token = $env:BROWSER_WORKER_TOKEN
  Bind = $env:BROWSER_WORKER_BIND
  Port = $env:BROWSER_WORKER_PORT
  Headless = $env:BROWSER_WORKER_HEADLESS
}
$worker = $null
try {
  $env:BROWSER_WORKER_TOKEN = $token
  $env:BROWSER_WORKER_BIND = "127.0.0.1"
  $env:BROWSER_WORKER_PORT = [string]$Port
  $env:BROWSER_WORKER_HEADLESS = "true"
  $options = @{
    FilePath = $node
    ArgumentList = @("server.mjs")
    WorkingDirectory = $workerDir
    WindowStyle = "Hidden"
    PassThru = $true
    RedirectStandardOutput = $stdoutFile
    RedirectStandardError = $stderrFile
  }
  $worker = Start-Process @options
} finally {
  if ($null -eq $prior.Token) { Remove-Item Env:BROWSER_WORKER_TOKEN -ErrorAction SilentlyContinue } else { $env:BROWSER_WORKER_TOKEN = $prior.Token }
  if ($null -eq $prior.Bind) { Remove-Item Env:BROWSER_WORKER_BIND -ErrorAction SilentlyContinue } else { $env:BROWSER_WORKER_BIND = $prior.Bind }
  if ($null -eq $prior.Port) { Remove-Item Env:BROWSER_WORKER_PORT -ErrorAction SilentlyContinue } else { $env:BROWSER_WORKER_PORT = $prior.Port }
  if ($null -eq $prior.Headless) { Remove-Item Env:BROWSER_WORKER_HEADLESS -ErrorAction SilentlyContinue } else { $env:BROWSER_WORKER_HEADLESS = $prior.Headless }
}
try {
  $ready = $false
  for ($attempt=0; $attempt -lt 20; $attempt++) {
    if ($worker.HasExited) { break }
    try {
      $options = @{
        Method = "Post"
        Uri = "http://127.0.0.1:$Port/health"
        Headers = @{Authorization="Bearer $token"}
        ContentType = "application/json"
        Body = "{}"
        TimeoutSec = 5
      }
      $health = Invoke-RestMethod @options
      if ($health.ok -eq $true -and $health.browserReady -eq $true -and $health.service -eq "palladium-playwright-worker") {
        $ready = $true
        break
      }
    } catch { }
    Start-Sleep -Milliseconds 800
  }
  if (-not $ready) { throw "Chromium worker failed its real local readiness check; public access remains disabled." }
  @{
    pid = $worker.Id
    startedUtc = $worker.StartTime.ToUniversalTime().ToString("o")
    port = $Port
  } | ConvertTo-Json | Set-Content -Path $processFile -Encoding UTF8
  Write-Host "Blackstar browser worker Chromium: LOCAL READY (PID $($worker.Id))." -ForegroundColor Green
  Write-Host "Listening only on http://127.0.0.1:$Port with bearer authentication."
  Write-Host "Private token stored with Windows DPAPI; no secret is printed."
  Write-Host "No public tunnel, firewall rule, hosting subscription or Vercel setting was changed."
  Write-Host "To stop: .\stop-local.ps1"
} catch {
  if ($worker -and -not $worker.HasExited) { Stop-Process -Id $worker.Id -ErrorAction SilentlyContinue }
  throw
}
