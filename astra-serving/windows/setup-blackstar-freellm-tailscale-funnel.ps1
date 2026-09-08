param(
  [int]$ProxyPort = 12781,
  [int]$HttpsPort = 8443,
  [string]$Model = 'nvidia/nemotron-3-super-120b-a12b:free'
)

$ErrorActionPreference = 'Stop'
$proxyScript = Join-Path $PSScriptRoot 'blackstar-freellm-bearer-proxy.ps1'
$runtimeDir = Join-Path $env:LOCALAPPDATA 'Blackstar\freellm-runtime'
$bridgeTokenPath = Join-Path $runtimeDir 'bridge-token.clixml'
$upstreamKeyPath = Join-Path $runtimeDir 'freellm-key.clixml'
New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null

function Resolve-TailscalePath {
  $cmd = Get-Command tailscale -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $candidate = "$env:ProgramFiles\Tailscale\tailscale.exe"
  if (Test-Path $candidate) { return $candidate }
  return $null
}

function Save-Secret([string]$Path, [Security.SecureString]$Secret) {
  $Secret | Export-Clixml -Path $Path
  try {
    $acl = Get-Acl -Path $Path
    $acl.SetAccessRuleProtection($true, $false)
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
    $rule = New-Object Security.AccessControl.FileSystemAccessRule(
      $identity,
      [Security.AccessControl.FileSystemRights]::FullControl,
      [Security.AccessControl.AccessControlType]::Allow
    )
    $acl.SetAccessRule($rule)
    Set-Acl -Path $Path -AclObject $acl
  } catch {
    Write-Warning 'Could not tighten the secret file ACL. The value remains DPAPI-encrypted for the current Windows user.'
  }
}

function SecureString-ToPlain([Security.SecureString]$Secret) {
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secret)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

function Get-FreeLoopbackPort {
  $listener = New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback, 0)
  try { $listener.Start(); return [int]$listener.LocalEndpoint.Port }
  finally { $listener.Stop() }
}

function Resolve-ProxyPort([int]$RequestedPort) {
  $existing = @(Get-NetTCPConnection -LocalPort $RequestedPort -State Listen -ErrorAction SilentlyContinue)
  if ($existing.Count -eq 0) { return $RequestedPort }
  return Get-FreeLoopbackPort
}

function Find-FreeLlmApiPort {
  $processes = @(Get-CimInstance Win32_Process | Where-Object {
    $_.Name -match '^FreeLLMAPI\.exe$' -or $_.CommandLine -match 'freellmapi'
  })
  if ($processes.Count -eq 0) { throw 'FreeLLMAPI desktop is not running. Start it first.' }
  $pids = @($processes | ForEach-Object { [int]$_.ProcessId })
  $listeners = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object {
    $_.LocalAddress -in @('127.0.0.1','::1') -and $pids -contains [int]$_.OwningProcess
  } | Sort-Object LocalPort -Unique)
  foreach ($listener in $listeners) {
    $port = [int]$listener.LocalPort
    try {
      $ping = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:$port/api/ping" -TimeoutSec 3
      if ([string]$ping.status -eq 'ok') { return $port }
    } catch {}
  }
  throw 'FreeLLMAPI is running, but no localhost listener returned /api/ping status=ok.'
}

Write-Host 'Blackstar independent FreeLLM evaluator bridge'
Write-Host "Pinned evaluator model: $Model"

$upstreamPort = Find-FreeLlmApiPort
Write-Host "Discovered FreeLLMAPI desktop on 127.0.0.1:$upstreamPort"

$tailscale = Resolve-TailscalePath
if (-not $tailscale) { throw 'Tailscale is not installed or tailscale.exe is unavailable.' }
$statusJson = & $tailscale status --json 2>$null
if ($LASTEXITCODE -ne 0 -or -not $statusJson) { throw 'Tailscale is not signed in.' }
$status = $statusJson | ConvertFrom-Json
if ([string]$status.BackendState -ne 'Running') { throw "Tailscale is not connected (state: $($status.BackendState))." }
$dnsName = ([string]$status.Self.DNSName).TrimEnd('.')
if (-not $dnsName) { throw 'Tailscale did not report a device DNS name.' }

$secureUpstreamKey = Read-Host 'Paste the FreeLLMAPI unified key (input is hidden)' -AsSecureString
if (-not $secureUpstreamKey -or $secureUpstreamKey.Length -lt 8) { throw 'A FreeLLMAPI unified key is required.' }
Save-Secret -Path $upstreamKeyPath -Secret $secureUpstreamKey
$upstreamKey = SecureString-ToPlain -Secret $secureUpstreamKey
try {
  $models = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:$upstreamPort/v1/models" -Headers @{ Authorization = "Bearer $upstreamKey" } -TimeoutSec 10
} finally {
  $upstreamKey = $null
}
$modelIds = @($models.data | ForEach-Object { [string]$_.id })
if ($modelIds -notcontains $Model) {
  throw "FreeLLMAPI is reachable, but the pinned evaluator model '$Model' was not returned by /v1/models."
}

$random = New-Object byte[] 48
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng.GetBytes($random) } finally { $rng.Dispose() }
$bridgeToken = [Convert]::ToBase64String($random).TrimEnd('=').Replace('+','-').Replace('/','_')
$secureBridgeToken = ConvertTo-SecureString -String $bridgeToken -AsPlainText -Force
Save-Secret -Path $bridgeTokenPath -Secret $secureBridgeToken

$ProxyPort = Resolve-ProxyPort -RequestedPort $ProxyPort
$proxy = $null
$ready = $false
try {
  Write-Host "Starting restricted localhost proxy on 127.0.0.1:$ProxyPort..."
  $proxy = Start-Process -FilePath 'powershell.exe' -ArgumentList @(
    '-NoProfile','-ExecutionPolicy','Bypass','-File',('"' + $proxyScript + '"'),
    '-Port',$ProxyPort,'-UpstreamPort',$upstreamPort,
    '-BridgeTokenSecretPath',('"' + $bridgeTokenPath + '"'),
    '-UpstreamKeySecretPath',('"' + $upstreamKeyPath + '"')
  ) -WindowStyle Hidden -PassThru

  $proxyReady = $false
  for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Milliseconds 500
    try {
      $probe = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:$ProxyPort/v1/models" -Headers @{ Authorization = "Bearer $bridgeToken" } -TimeoutSec 3
      if (@($probe.data | ForEach-Object { $_.id }) -contains $Model) { $proxyReady = $true; break }
    } catch {}
  }
  if (-not $proxyReady) { throw 'The Blackstar FreeLLM localhost proxy did not become ready.' }

  Write-Host "Publishing only the FreeLLM proxy through Tailscale Funnel HTTPS port $HttpsPort..."
  $funnelOutput = & $tailscale funnel --bg --yes --https=$HttpsPort "http://127.0.0.1:$ProxyPort" 2>&1
  if ($LASTEXITCODE -ne 0) { throw "Tailscale Funnel could not publish the FreeLLM bridge. $(($funnelOutput | Out-String).Trim())" }

  $publicBase = "https://${dnsName}:$HttpsPort"
  $remoteReady = $false
  $lastError = $null
  for ($i = 0; $i -lt 30; $i++) {
    try {
      $remote = Invoke-RestMethod -Method Get -Uri "$publicBase/v1/models" -Headers @{ Authorization = "Bearer $bridgeToken" } -TimeoutSec 10
      if (@($remote.data | ForEach-Object { $_.id }) -contains $Model) { $remoteReady = $true; break }
      $lastError = 'expected pinned model identity was not returned'
    } catch { $lastError = $_.Exception.Message }
    Start-Sleep -Seconds 2
  }
  if (-not $remoteReady) { throw "The FreeLLM Funnel route did not become ready. Last error: $lastError" }

  @{
    transport = 'tailscale-funnel'
    purpose = 'independent-evaluator'
    upstream_port = $upstreamPort
    proxy_port = $ProxyPort
    https_port = $HttpsPort
    public_base_url = $publicBase
    model = $Model
    proxy_pid = $proxy.Id
    started_at = (Get-Date).ToString('o')
  } | ConvertTo-Json | Set-Content -Path (Join-Path $runtimeDir 'bridge.json') -Encoding UTF8

  $clipboardCopied = $false
  try { Set-Clipboard -Value $bridgeToken; $clipboardCopied = $true } catch {}

  $ready = $true
  Write-Host ''
  Write-Host 'Blackstar independent FreeLLM evaluator bridge is operational.' -ForegroundColor Green
  Write-Host ''
  Write-Host 'Use these SERVER-ONLY deployment values:'
  Write-Host "FREELLMAPI_BASE_URL=$publicBase/v1"
  if ($clipboardCopied) { Write-Host 'FREELLMAPI_API_KEY=<Blackstar bridge token copied to clipboard; value intentionally not printed>' }
  else { Write-Host "FREELLMAPI_API_KEY=<stored DPAPI-encrypted at $bridgeTokenPath>" }
  Write-Host "FREELLMAPI_MODEL=$Model"
  Write-Host ''
  Write-Warning 'This is a separate evaluator Funnel on HTTPS 8443. The existing native Qwen Funnel on HTTPS 443 is not changed. The FreeLLM unified key is never printed and is stored DPAPI-encrypted for the current Windows user.'
} finally {
  $bridgeToken = $null
  if (-not $ready -and $proxy -and -not $proxy.HasExited) {
    Stop-Process -Id $proxy.Id -Force -ErrorAction SilentlyContinue
  }
}
