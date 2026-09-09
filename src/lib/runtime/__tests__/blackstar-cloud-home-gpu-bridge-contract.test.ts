import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const setup = readFileSync(resolve(root, 'astra-serving/windows/setup-blackstar-cloud-bridge.ps1'), 'utf8')
const tailscaleSetup = readFileSync(resolve(root, 'astra-serving/windows/setup-blackstar-tailscale-funnel.ps1'), 'utf8')
const proxy = readFileSync(resolve(root, 'astra-serving/windows/blackstar-ollama-bearer-proxy.ps1'), 'utf8')
const stop = readFileSync(resolve(root, 'astra-serving/windows/stop-blackstar-cloud-bridge.ps1'), 'utf8')
const readme = readFileSync(resolve(root, 'astra-serving/windows/README.md'), 'utf8')

describe('Blackstar cloud-to-home GPU bridge', () => {
  it('keeps Ollama and the bearer proxy on localhost', () => {
    expect(setup).toContain('http://127.0.0.1:11434/v1/models')
    expect(proxy).toContain('listener.Prefixes.Add("http://127.0.0.1:" + port + "/")')
    expect(proxy).toContain('http://127.0.0.1:11434')
    expect(setup).not.toMatch(/0\.0\.0\.0/)
    expect(proxy).not.toMatch(/0\.0\.0\.0/)
  })

  it('requires a strong bearer token and restricts the public API surface', () => {
    expect(proxy).toContain('BLACKSTAR_BRIDGE_TOKEN')
    expect(proxy).toContain('$token.Length -lt 32')
    expect(proxy).toContain('var expectedAuth = "Bearer " + token')
    expect(proxy).toContain('String.Equals(request.Headers["Authorization"], expectedAuth, StringComparison.Ordinal)')
    expect(proxy).toContain('/v1/models')
    expect(proxy).toContain('/v1/chat/completions')
    expect(proxy).toContain('WriteJsonAsync(response, 404')
  })

  it('keeps the native bridge responsive with bounded concurrent upstream requests', () => {
    expect(proxy).toContain('[int]$UpstreamTimeoutSeconds = 60')
    expect(proxy).toContain('[int]$MaxConcurrentRequests = 4')
    expect(proxy).toContain('new SemaphoreSlim(maxConcurrentRequests, maxConcurrentRequests)')
    expect(proxy).toContain('new CancellationTokenSource(TimeSpan.FromSeconds(timeoutSeconds))')
    expect(proxy).toContain('TryWriteJson(response, 504, "{\\"error\\":\\"upstream_timeout\\"}")')
    expect(tailscaleSetup).toContain('Warming exact native model before publishing the bridge')
    expect(tailscaleSetup).toContain('Reply with OK. /no_think')
    expect(tailscaleSetup).toContain('max_tokens = 1')
  })

  it('uses TLS tunnel output and verifies the remote route before printing deployment values', () => {
    expect(setup).toContain('trycloudflare.com')
    expect(setup).toContain('Verifying authenticated remote model discovery')
    expect(setup).toContain('OPENAI_COMPATIBLE_BASE_URL=$tunnelUrl/v1')
    expect(setup).toContain('OPENAI_COMPATIBLE_API_KEY=$token')
    expect(setup).toContain('BLACKSTAR_NATIVE_PRIMARY=true')
  })

  it('stores only process metadata on disk and keeps the bearer token out of bridge state', () => {
    expect(setup).toContain('bridge.json')
    expect(setup).not.toMatch(/token\s*=\s*\$token[\s\S]*ConvertTo-Json/)
    expect(stop).toContain('Stop-Process')
    expect(stop).toContain('Ollama remains localhost-only')
  })

  it('documents that the quick tunnel is temporary and not certification', () => {
    expect(readme).toContain('Quick Tunnel is a development bridge, not the final production topology')
    expect(readme).toContain('does not create Model Arena runs, attestations or verified evidence')
    expect(readme).toContain('Do **not** expose Ollama\'s port 11434 directly to the internet')
  })
})
