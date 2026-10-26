param(
  [int]$ProxyPort = 12780,
  [string]$Model = "qwen3:8b-q4_K_M"
)

$ErrorActionPreference = "Stop"
$proxyScript = Join-Path $PSScriptRoot "blackstar-ollama-bearer-proxy.ps1"
$runtimeDir = Join-Path $env:LOCALAPPDATA "Blackstar\runtime"
New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
$statePath = Join-Path $runtimeDir "bridge.json"
$tokenSecretPath = Join-Path $runtimeDir "bridge-token.clixml"
# The Tailscale and Cloudflare development bridges share the same managed state.
# Never overwrite a running bridge (or its bearer credential) on another transport.
if (Test-Path $statePath) {
  throw "An existing Blackstar model bridge state was found. Stop/reconcile the existing model bridge before starting another. Do not reset an unrelated browser-worker Funnel."
}

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
      Write-Host "Stopping stale Blackstar proxy process $pidValue from a previous failed bridge attempt..."
      Stop-Process -Id $pidValue -Force -ErrorAction SilentlyContinue
      Start-Sleep -Milliseconds 500
    }
  }

  $remaining = @(Get-NetTCPConnection -LocalPort $RequestedPort -State Listen -ErrorAction SilentlyContinue)
  if ($remaining.Count -eq 0) { return $RequestedPort }

  $owners = @($remaining | ForEach-Object { [int]$_.OwningProcess } | Select-Object -Unique)
  $fallbackPort = Get-FreeLoopbackPort
  Write-Host "Port $RequestedPort is occupied by process(es) $($owners -join ', '). Using free localhost proxy port $fallbackPort instead..."
  return $fallbackPort
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

$ProxyPort = Resolve-ProxyPort -RequestedPort $ProxyPort

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

$proxy = $null
$tunnel = $null
$bridgeReady = $false
$tokenSaved = $false
$stateSaved = $false
try {
  Write-Host "Starting localhost-only authenticated proxy on port $ProxyPort..."
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
    throw "The Blackstar authenticated localhost proxy did not become ready on port $ProxyPort."
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
    $tail = ""
    if (Test-Path $errLog) { $tail = (Get-Content $errLog -Tail 20 -ErrorAction SilentlyContinue) -join "`n" }
    throw "Cloudflare tunnel did not publish a URL. $tail"
  }

  Write-Host "Verifying tunnel registration, hostname DNS and authenticated remote model discovery..."
  $remoteHeaders = @{ Authorization = "Bearer $token" }
  $remoteModels = $null
  $remoteError = $null
  $dnsFailed = $false
  $hostName = ([Uri]$tunnelUrl).DnsSafeHost
  # A Quick Tunnel prints its random hostname before it is necessarily resolvable
  # through the Windows system resolver. Do not mistake this race for a GPU error.
  for ($i = 0; $i -lt 60; $i++) {
    if ($tunnel.HasExited) {
      $remoteError = "cloudflared exited before authenticated remote readiness."
      break
    }
    $registered = $false
    if (Test-Path $errLog) {
      $registered = [bool](Select-String -Path $errLog -Pattern 'Registered tunnel connection' -Quiet -ErrorAction SilentlyContinue)
    }
    if (-not $registered) {
      $remoteError = "Waiting for cloudflared to register a tunnel connection."
      Start-Sleep -Seconds 2
      continue
    }
    try {
      $addresses = @([System.Net.Dns]::GetHostAddresses($hostName))
      if ($addresses.Count -eq 0) { throw "No addresses returned." }
      $dnsFailed = $false
    } catch {
      $dnsFailed = $true
      $remoteError = "Windows cannot resolve the temporary tunnel hostname $hostName. Waiting for DNS readiness."
      Start-Sleep -Seconds 2
      continue
    }
    try {
      $remoteModels = Invoke-RestMethod -Method Get -Uri "$tunnelUrl/v1/models" -Headers $remoteHeaders -TimeoutSec 10
      if (@($remoteModels.data | ForEach-Object { $_.id }) -contains $Model) {
        $remoteError = $null
        break
      }
      $remoteError = "The remote endpoint responded but did not advertise the exact model $Model."
    } catch {
      $remoteError = $_.Exception.Message
    }
    Start-Sleep -Seconds 2
  }
  if (-not $remoteModels -or @($remoteModels.data | ForEach-Object { $_.id }) -notcontains $Model) {
    $tail = ""
    if (Test-Path $errLog) { $tail = (Get-Content $errLog -Tail 12 -ErrorAction SilentlyContinue) -join "`n" }
    if ($dnsFailed) {
      $publicDnsResult = "Public DNS resolver probe not available."
      $dnsTool = Get-Command Resolve-DnsName -ErrorAction SilentlyContinue
      if ($dnsTool) {
        try {
          $lookup = @(Resolve-DnsName -Name $hostName -Server "1.1.1.1" -Type A -DnsOnly -ErrorAction Stop)
          $publicDnsResult = if (@($lookup | Where-Object { $_.IPAddress }).Count -gt 0) {
            "Cloudflare public DNS resolves the hostname; your Windows DNS resolver may have a cached negative result or be filtering the hostname."
          } else {
            "Cloudflare public DNS does not yet return an A record."
          }
        } catch {
          $publicDnsResult = "Cloudflare public DNS did not return an A record (or direct DNS queries are blocked)."
        }
      }
      throw "The temporary tunnel hostname was not resolvable after bounded retries: $hostName. $publicDnsResult Close this attempt and rerun the bridge for a fresh hostname if the problem persists. Last state: $remoteError`nCloudflared log:`n$tail"
    }
    throw "The authenticated remote bridge did not become ready. Last state: $remoteError`nCloudflared log:`n$tail"
  }

  # Persist the secret using Windows DPAPI under this user; never display it in
  # PowerShell output or log files. The existing copy helper retrieves it safely.
  $secure = ConvertTo-SecureString -String $token -AsPlainText -Force
  $secure | Export-Clixml -Path $tokenSecretPath
  $tokenSaved = $true

  # Publish state only after the authenticated remote route and encrypted token
  # have been verified. Failed attempts must not leave a fake ready record.
  @{
    transport = "cloudflare-quick-tunnel"
    proxy_pid = $proxy.Id
    tunnel_pid = $tunnel.Id
    proxy_port = $ProxyPort
    tunnel_url = $tunnelUrl
    started_at = (Get-Date).ToString("o")
  } | ConvertTo-Json | Set-Content -Path $statePath -Encoding UTF8
  $stateSaved = $true
  $copied = $false
  try {
    Set-Clipboard -Value $token
    $copied = $true
  } catch {
    Write-Warning "Could not copy the bridge token. Use copy-blackstar-bridge-token.ps1 to copy it securely."
  }

  $bridgeReady = $true

  Write-Host ""
  Write-Host "Blackstar authenticated cloud bridge is operational." -ForegroundColor Green
  Write-Host ""
  Write-Host "Use these SERVER-ONLY deployment values:"
  Write-Host "OPENAI_COMPATIBLE_BASE_URL=$tunnelUrl/v1"
  if ($copied) {
    Write-Host "OPENAI_COMPATIBLE_API_KEY=<copied to clipboard; value intentionally not printed>"
  } else {
    Write-Host "OPENAI_COMPATIBLE_API_KEY=<stored encrypted; use copy-blackstar-bridge-token.ps1>"
  }
  Write-Host "BLACKSTAR_NATIVE_MODEL=$Model"
  Write-Host "BLACKSTAR_NATIVE_PRIMARY=true"
  Write-Host ""
  Write-Host "Security boundary: Ollama remains bound to localhost. The public tunnel reaches only a localhost bearer-auth proxy that permits GET /v1/models and POST /v1/chat/completions."
  Write-Warning "This trycloudflare.com URL is a temporary development bridge, not the final production tunnel. Keep the bearer token secret. Closing or stopping the tunnel invalidates this route."
  Write-Host "To stop the bridge: powershell -ExecutionPolicy Bypass -File .\astra-serving\windows\stop-blackstar-cloud-bridge.ps1"
} finally {
  if (-not $bridgeReady) {
    if ($stateSaved) { Remove-Item $statePath -Force -ErrorAction SilentlyContinue }
    if ($tokenSaved) { Remove-Item $tokenSecretPath -Force -ErrorAction SilentlyContinue }
    if ($tunnel -and -not $tunnel.HasExited) {
      Stop-Process -Id $tunnel.Id -Force -ErrorAction SilentlyContinue
    }
    if ($proxy -and -not $proxy.HasExited) {
      Stop-Process -Id $proxy.Id -Force -ErrorAction SilentlyContinue
    }
  }
}
