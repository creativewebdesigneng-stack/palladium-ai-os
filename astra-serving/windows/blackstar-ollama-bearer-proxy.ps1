param(
  [int]$Port = 12780,
  [string]$OllamaBaseUrl = "http://127.0.0.1:11434",
  [int]$UpstreamTimeoutSeconds = 60,
  [int]$MaxConcurrentRequests = 4
)

$ErrorActionPreference = "Stop"
$token = $env:BLACKSTAR_BRIDGE_TOKEN
if (-not $token -or $token.Length -lt 32) {
  throw "BLACKSTAR_BRIDGE_TOKEN must be set to a random secret of at least 32 characters."
}
if ($UpstreamTimeoutSeconds -lt 1) {
  throw "UpstreamTimeoutSeconds must be at least 1."
}
if ($MaxConcurrentRequests -lt 1 -or $MaxConcurrentRequests -gt 16) {
  throw "MaxConcurrentRequests must be between 1 and 16."
}

Add-Type -AssemblyName System.Net.Http

$source = @'
using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

public static class BlackstarBearerProxy
{
    public static void Run(string token, int port, string ollamaBaseUrl, int upstreamTimeoutSeconds, int maxConcurrentRequests)
    {
        RunAsync(token, port, ollamaBaseUrl, upstreamTimeoutSeconds, maxConcurrentRequests).GetAwaiter().GetResult();
    }

    private static async Task RunAsync(string token, int port, string ollamaBaseUrl, int upstreamTimeoutSeconds, int maxConcurrentRequests)
    {
        var listener = new HttpListener();
        listener.Prefixes.Add("http://127.0.0.1:" + port + "/");
        listener.Start();

        var handler = new HttpClientHandler { AllowAutoRedirect = false };
        var client = new HttpClient(handler);
        client.Timeout = Timeout.InfiniteTimeSpan;
        var gate = new SemaphoreSlim(maxConcurrentRequests, maxConcurrentRequests);

        Console.WriteLine("Blackstar bearer proxy listening on 127.0.0.1:" + port);
        Console.WriteLine("Concurrent request limit: " + maxConcurrentRequests);
        Console.WriteLine("Ollama upstream timeout: " + upstreamTimeoutSeconds + "s");

        try
        {
            while (listener.IsListening)
            {
                var context = await listener.GetContextAsync().ConfigureAwait(false);
                Task.Run(async () =>
                {
                    await gate.WaitAsync().ConfigureAwait(false);
                    try
                    {
                        await HandleAsync(context, client, token, ollamaBaseUrl.TrimEnd('/'), upstreamTimeoutSeconds).ConfigureAwait(false);
                    }
                    finally
                    {
                        gate.Release();
                    }
                });
            }
        }
        finally
        {
            gate.Dispose();
            client.Dispose();
            handler.Dispose();
            listener.Stop();
            listener.Close();
        }
    }

    private static async Task HandleAsync(HttpListenerContext context, HttpClient client, string token, string ollamaBaseUrl, int upstreamTimeoutSeconds)
    {
        var response = context.Response;
        HttpRequestMessage message = null;
        HttpResponseMessage upstream = null;
        CancellationTokenSource timeout = null;

        try
        {
            var request = context.Request;
            var expectedAuth = "Bearer " + token;
            if (!String.Equals(request.Headers["Authorization"], expectedAuth, StringComparison.Ordinal))
            {
                await WriteJsonAsync(response, 401, "{\"error\":\"unauthorized\"}").ConfigureAwait(false);
                return;
            }

            var path = request.Url.AbsolutePath;
            var allowed = (request.HttpMethod == "GET" && path == "/v1/models") ||
                          (request.HttpMethod == "POST" && path == "/v1/chat/completions");
            if (!allowed)
            {
                await WriteJsonAsync(response, 404, "{\"error\":\"not_found\"}").ConfigureAwait(false);
                return;
            }

            var target = ollamaBaseUrl + request.Url.PathAndQuery;
            message = new HttpRequestMessage(new HttpMethod(request.HttpMethod), target);

            if (request.HasEntityBody)
            {
                var memory = new MemoryStream();
                await request.InputStream.CopyToAsync(memory).ConfigureAwait(false);
                var content = new ByteArrayContent(memory.ToArray());
                memory.Dispose();
                if (!String.IsNullOrWhiteSpace(request.ContentType))
                {
                    content.Headers.TryAddWithoutValidation("Content-Type", request.ContentType);
                }
                message.Content = content;
            }

            var accept = request.Headers["Accept"];
            if (!String.IsNullOrWhiteSpace(accept))
            {
                message.Headers.TryAddWithoutValidation("Accept", accept);
            }

            var timeoutSeconds = path == "/v1/chat/completions"
                ? upstreamTimeoutSeconds
                : Math.Min(20, upstreamTimeoutSeconds);
            timeout = new CancellationTokenSource(TimeSpan.FromSeconds(timeoutSeconds));

            upstream = await client.SendAsync(message, HttpCompletionOption.ResponseHeadersRead, timeout.Token).ConfigureAwait(false);
            response.StatusCode = (int)upstream.StatusCode;
            if (upstream.Content.Headers.ContentType != null)
            {
                response.ContentType = upstream.Content.Headers.ContentType.ToString();
            }
            if (upstream.Headers.Contains("Cache-Control"))
            {
                response.Headers["Cache-Control"] = String.Join(",", upstream.Headers.GetValues("Cache-Control"));
            }

            var length = upstream.Content.Headers.ContentLength;
            if (length.HasValue)
            {
                response.ContentLength64 = length.Value;
            }
            else
            {
                response.SendChunked = true;
            }

            var stream = await upstream.Content.ReadAsStreamAsync().ConfigureAwait(false);
            try
            {
                await stream.CopyToAsync(response.OutputStream, 81920, timeout.Token).ConfigureAwait(false);
                await response.OutputStream.FlushAsync(timeout.Token).ConfigureAwait(false);
            }
            finally
            {
                stream.Dispose();
            }
            response.Close();
        }
        catch (OperationCanceledException)
        {
            TryWriteJson(response, 504, "{\"error\":\"upstream_timeout\"}");
        }
        catch
        {
            TryWriteJson(response, 502, "{\"error\":\"upstream_unavailable\"}");
        }
        finally
        {
            if (timeout != null) timeout.Dispose();
            if (upstream != null) upstream.Dispose();
            if (message != null) message.Dispose();
        }
    }

    private static async Task WriteJsonAsync(HttpListenerResponse response, int statusCode, string json)
    {
        var bytes = Encoding.UTF8.GetBytes(json);
        response.StatusCode = statusCode;
        response.ContentType = "application/json";
        response.ContentLength64 = bytes.Length;
        await response.OutputStream.WriteAsync(bytes, 0, bytes.Length).ConfigureAwait(false);
        response.Close();
    }

    private static void TryWriteJson(HttpListenerResponse response, int statusCode, string json)
    {
        try
        {
            if (!response.OutputStream.CanWrite) return;
            var bytes = Encoding.UTF8.GetBytes(json);
            response.StatusCode = statusCode;
            response.ContentType = "application/json";
            response.ContentLength64 = bytes.Length;
            response.OutputStream.Write(bytes, 0, bytes.Length);
            response.Close();
        }
        catch
        {
            try { response.Abort(); } catch { }
        }
    }
}
'@

Add-Type -TypeDefinition $source -Language CSharp -ReferencedAssemblies System.Net.Http
[BlackstarBearerProxy]::Run($token, $Port, $OllamaBaseUrl, $UpstreamTimeoutSeconds, $MaxConcurrentRequests)
