param(
  [int]$Port = 12780,
  [string]$OllamaBaseUrl = "http://127.0.0.1:11434"
)

$ErrorActionPreference = "Stop"
$token = $env:BLACKSTAR_BRIDGE_TOKEN
if (-not $token -or $token.Length -lt 32) {
  throw "BLACKSTAR_BRIDGE_TOKEN must be set to a random secret of at least 32 characters."
}

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$listener.Start()

$handler = [System.Net.Http.HttpClientHandler]::new()
$handler.AllowAutoRedirect = $false
$client = [System.Net.Http.HttpClient]::new($handler)
$client.Timeout = [System.Threading.Timeout]::InfiniteTimeSpan

Write-Host "Blackstar bearer proxy listening on 127.0.0.1:$Port"

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    try {
      $request = $context.Request
      $response = $context.Response
      $expectedAuth = "Bearer $token"

      if ($request.Headers["Authorization"] -cne $expectedAuth) {
        $response.StatusCode = 401
        $response.ContentType = "application/json"
        $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"error":"unauthorized"}')
        $response.ContentLength64 = $bytes.Length
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
        $response.Close()
        continue
      }

      $path = $request.Url.AbsolutePath
      $allowed = (($request.HttpMethod -eq "GET") -and ($path -eq "/v1/models")) -or
        (($request.HttpMethod -eq "POST") -and ($path -eq "/v1/chat/completions"))
      if (-not $allowed) {
        $response.StatusCode = 404
        $response.ContentType = "application/json"
        $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"error":"not_found"}')
        $response.ContentLength64 = $bytes.Length
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
        $response.Close()
        continue
      }

      $target = "$OllamaBaseUrl$($request.Url.PathAndQuery)"
      $message = [System.Net.Http.HttpRequestMessage]::new(
        [System.Net.Http.HttpMethod]::new($request.HttpMethod),
        $target
      )

      if ($request.HasEntityBody) {
        $memory = [System.IO.MemoryStream]::new()
        $request.InputStream.CopyTo($memory)
        $content = [System.Net.Http.ByteArrayContent]::new($memory.ToArray())
        if ($request.ContentType) {
          $content.Headers.TryAddWithoutValidation("Content-Type", $request.ContentType) | Out-Null
        }
        $message.Content = $content
      }

      if ($request.Headers["Accept"]) {
        $message.Headers.TryAddWithoutValidation("Accept", $request.Headers["Accept"]) | Out-Null
      }

      $upstream = $client.SendAsync(
        $message,
        [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead
      ).GetAwaiter().GetResult()

      $response.StatusCode = [int]$upstream.StatusCode
      if ($upstream.Content.Headers.ContentType) {
        $response.ContentType = $upstream.Content.Headers.ContentType.ToString()
      }
      if ($upstream.Headers.Contains("Cache-Control")) {
        $response.Headers["Cache-Control"] = ($upstream.Headers.GetValues("Cache-Control") -join ",")
      }
      $response.SendChunked = $true

      $stream = $upstream.Content.ReadAsStreamAsync().GetAwaiter().GetResult()
      $stream.CopyTo($response.OutputStream)
      $response.OutputStream.Flush()
      $response.Close()

      $stream.Dispose()
      $upstream.Dispose()
      $message.Dispose()
    } catch {
      try {
        if ($context.Response.OutputStream.CanWrite) {
          $context.Response.StatusCode = 502
          $context.Response.Close()
        }
      } catch {}
    }
  }
} finally {
  $client.Dispose()
  $listener.Stop()
  $listener.Close()
}
