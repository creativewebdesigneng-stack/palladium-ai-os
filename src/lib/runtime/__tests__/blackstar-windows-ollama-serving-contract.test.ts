import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const setup = readFileSync(resolve(root, 'astra-serving/windows/setup-blackstar-ollama.ps1'), 'utf8')
const readme = readFileSync(resolve(root, 'astra-serving/windows/README.md'), 'utf8')
const bridge = readFileSync(resolve(root, 'astra-serving/windows/setup-blackstar-cloud-bridge.ps1'), 'utf8')
const stopBridge = readFileSync(resolve(root, 'astra-serving/windows/stop-blackstar-cloud-bridge.ps1'), 'utf8')

describe('Blackstar Windows Ollama serving bundle', () => {
  it('keeps the default Ollama listener on localhost and uses the compatible /v1 contract', () => {
    expect(setup).toContain('http://127.0.0.1:11434')
    expect(setup).toContain('$OpenAiBaseUrl = "$BaseUrl/v1"')
    expect(setup).toContain('/models')
    expect(setup).toContain('/chat/completions')
    expect(setup).not.toMatch(/0\.0\.0\.0:11434/)
  })

  it('uses the intended 8B quantized development model by default', () => {
    expect(setup).toContain('[string]$Model = "qwen3:8b-q4_K_M"')
    expect(readme).toContain('qwen3:8b-q4_K_M')
  })

  it('gives thinking-capable Qwen3 enough completion budget to emit final content', () => {
    expect(setup).toContain('BLACKSTAR_READY /no_think')
    expect(setup).toContain('max_tokens = 512')
    expect(setup).toContain('TimeoutSec 300')
  })

  it('refuses to claim GPU success from a CPU-only API response', () => {
    expect(setup).toContain('http://127.0.0.1:11434')
    expect(setup).toContain('/api/ps')
    expect(setup).toContain('size_vram')
    expect(setup).toContain('if ($gpuBytes -le 0)')
    expect(setup).toContain('Inference may have run on CPU')
    expect(setup).toContain('Active model GPU residency')
    expect(setup).toContain("if ($text -notmatch 'BLACKSTAR_READY')")
  })

  it('prints the exact Blackstar native-primary environment contract', () => {
    expect(setup).toContain('OPENAI_COMPATIBLE_BASE_URL=$OpenAiBaseUrl')
    expect(setup).toContain('BLACKSTAR_NATIVE_MODEL=$Model')
    expect(setup).toContain('BLACKSTAR_NATIVE_PRIMARY=true')
  })

  it('does not embed an API credential or fabricate certification evidence', () => {
    expect(setup).not.toMatch(/OPENAI_COMPATIBLE_API_KEY\s*=\s*[^$\r\n]+/)
    expect(setup).not.toMatch(/model_eval_verified_evidence|model_eval_runs|attest/i)
    expect(readme).toContain('does not create Model Arena runs, attestations or verified evidence')
  })

  it('waits for Quick Tunnel registration and Windows DNS before authenticating remotely', () => {
    expect(bridge).toContain('Registered tunnel connection')
    expect(bridge).toContain('[System.Net.Dns]::GetHostAddresses($hostName)')
    expect(bridge).toContain('Resolve-DnsName -Name $hostName -Server "1.1.1.1"')
    expect(bridge).toContain('Cloudflare public DNS resolves the hostname')
    expect(bridge).toContain('The temporary tunnel hostname was not resolvable after bounded retries')
    expect(bridge).toContain('$remoteModels = Invoke-RestMethod')
    expect(bridge).toContain('@($remoteModels.data | ForEach-Object { $_.id }) -contains $Model')
  })

  it('never prints the bearer token and only persists bridge state after validation', () => {
    expect(bridge).not.toContain('OPENAI_COMPATIBLE_API_KEY=$token')
    expect(bridge).toContain('Set-Clipboard -Value $token')
    expect(bridge).toContain('Export-Clixml -Path $tokenSecretPath')
    expect(bridge).toContain('OPENAI_COMPATIBLE_API_KEY=<copied to clipboard; value intentionally not printed>')
    expect(bridge).toContain('OPENAI_COMPATIBLE_API_KEY=<stored encrypted; use copy-blackstar-bridge-token.ps1>')
    expect(bridge.indexOf('Export-Clixml -Path $tokenSecretPath')).toBeLessThan(bridge.indexOf('$stateSaved = $true'))
    expect(bridge).toContain('if ($stateSaved) { Remove-Item $statePath')
    expect(bridge).toContain('if ($tokenSaved) { Remove-Item $tokenSecretPath')
    expect(bridge).toContain('if (Test-Path $statePath)')
    expect(bridge).not.toMatch(/0\.0\.0\.0:11434/)
    expect(stopBridge).toContain('bridge.json')
  })

  it('warns against directly exposing the Ollama port to the public internet', () => {
    expect(setup).toContain('Do not expose port 11434 directly to the public internet')
    expect(readme).toContain('Do **not** expose Ollama\'s port 11434 directly to the internet')
  })
})
