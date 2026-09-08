param(
  [Parameter(Mandatory = $true)][int]$Port,
  [Parameter(Mandatory = $true)][int]$UpstreamPort,
  [Parameter(Mandatory = $true)][string]$BridgeTokenSecretPath,
  [Parameter(Mandatory = $true)][string]$UpstreamKeySecretPath
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http

function Read-Secret([string]$Path) {
  if (-not (Test-Path $Path)) { throw "Secret file not found: $Path" }
  $secure = Import-Clixml -Path $Path
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

function Get-SafeBridgeFailure([Exception]$Exception) {
  $type = $Exception.GetType().FullName
  $message = [string]$Exception.Message
  if ($type -match 'TaskCanceledException|TimeoutException' -or $message -match '(?i)timed out|timeout') {
    return @{ code = 'upstream_timeout'; message = 'FreeLLMAPI did not respond before the local bridge timeout.' }
  }
  if ($message -match '(?i)actively refused|connection refused') {
    return @{ code = 'upstream_connection_refused'; message = 'FreeLLMAPI is not accepting connections on the discovered localhost port.' }
  }
  if ($message -match '(?i)forcibly closed|connection reset|unexpected end') {
    return @{ code = 'upstream_connection_reset'; message = 'The local FreeLLMAPI connection was closed before a complete response was returned.' }
  }
  if ($type -match 'HttpRequestException|SocketException') {
    return @{ code = 'upstream_unreachable'; message = 'The local FreeLLMAPI endpoint could not be reached by the Blackstar bridge.' }
  }
  return @{ code = 'bridge_proxy_error'; message = 'The Blackstar FreeLLM bridge failed while forwarding the evaluator request.' }
}

function Write-JsonFailure($Response, [int]$StatusCode, [string]$Code, [string]$Message) {
  $payload = @{ error = @{ code = $Code; message = $Message } } | ConvertTo-Json -Compress
  $bytes = [Text.Encoding]::UTF8.GetBytes($payload)
  $Response.StatusCode = $StatusCode
  $Response.ContentType = 'application/json; charset=utf-8'
  $Response.ContentLength64 = $bytes.Length
  $Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $Response.Close()
}

$bridgeToken = Read-Secret -Path $BridgeTokenSecretPath
$upstreamKey = Read-Secret -Path $UpstreamKeySecretPath
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$listener.Start()

$handler = New-Object System.Net.Http.HttpClientHandler
$client = New-Object System.Net.Http.HttpClient($handler)
$client.Timeout = [TimeSpan]::FromSeconds(120)

Write-Host "Blackstar FreeLLM bearer proxy listening on 127.0.0.1:$Port -> 127.0.0.1:$UpstreamPort"

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    try {
      $request = $context.Request
      $response = $context.Response
      $auth = [string]$request.Headers['Authorization']
      if ($auth -ne "Bearer $bridgeToken") {
        $response.StatusCode = 401
        $response.Close()
        continue
      }

      $path = $request.Url.AbsolutePath
      $allowed = ($request.HttpMethod -eq 'GET' -and $path -eq '/v1/models') -or
        ($request.HttpMethod -eq 'POST' -and $path -eq '/v1/chat/completions')
      if (-not $allowed) {
        $response.StatusCode = 404
        $response.Close()
        continue
      }

      $target = "http://127.0.0.1:$UpstreamPort$path"
      $method = New-Object System.Net.Http.HttpMethod($request.HttpMethod)
      $message = New-Object System.Net.Http.HttpRequestMessage($method, $target)
      $message.Headers.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue('Bearer', $upstreamKey)

      if ($request.HasEntityBody) {
        $reader = New-Object IO.StreamReader($request.InputStream, $request.ContentEncoding)
        try { $body = $reader.ReadToEnd() } finally { $reader.Dispose() }
        $message.Content = New-Object System.Net.Http.StringContent($body, [Text.Encoding]::UTF8, 'application/json')
      }

      $upstream = $client.SendAsync($message).GetAwaiter().GetResult()
      $response.StatusCode = [int]$upstream.StatusCode
      foreach ($header in $upstream.Headers) {
        if ($header.Key -in @('Transfer-Encoding','Connection','Keep-Alive')) { continue }
        try { $response.Headers[$header.Key] = ($header.Value -join ',') } catch {}
      }
      if ($upstream.Content) {
        foreach ($header in $upstream.Content.Headers) {
          if ($header.Key -eq 'Content-Length') { continue }
          try { $response.Headers[$header.Key] = ($header.Value -join ',') } catch {}
        }
        $bytes = $upstream.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult()
        $response.ContentLength64 = $bytes.Length
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
      }
      $response.Close()
      $message.Dispose()
      $upstream.Dispose()
    } catch {
      $safe = Get-SafeBridgeFailure -Exception $_.Exception
      Write-Warning "FreeLLM bridge request failed: $($safe.code)"
      try { Write-JsonFailure -Response $context.Response -StatusCode 502 -Code $safe.code -Message $safe.message } catch {}
    }
  }
} finally {
  $client.Dispose()
  $handler.Dispose()
  if ($listener.IsListening) { $listener.Stop() }
  $listener.Close()
}
