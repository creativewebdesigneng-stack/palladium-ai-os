import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const setup = readFileSync(resolve(root, 'astra-serving/windows/setup-blackstar-tailscale-funnel.ps1'), 'utf8')
const stop = readFileSync(resolve(root, 'astra-serving/windows/stop-blackstar-cloud-bridge.ps1'), 'utf8')
const docs = readFileSync(resolve(root, 'astra-serving/windows/TAILSCALE_FUNNEL.md'), 'utf8')

describe('Blackstar Tailscale Funnel bridge', () => {
  it('keeps Ollama on localhost and publishes only the bearer proxy', () => {
    expect(setup).toContain('http://127.0.0.1:11434/v1/models')
    expect(setup).toContain('blackstar-ollama-bearer-proxy.ps1')
    expect(setup).toContain('tailscale funnel')
    expect(setup).not.toMatch(/0\.0\.0\.0:11434/)
  })

  it('uses a stable ts.net hostname and verifies authenticated model discovery', () => {
    expect(setup).toContain('$status.Self.DNSName')
    expect(setup).toContain('https://$dnsName')
    expect(setup).toContain('Authorization = "Bearer $token"')
    expect(setup).toContain('/v1/models')
    expect(setup).toContain('OPENAI_COMPATIBLE_BASE_URL=$publicBase/v1')
  })

  it('requires explicit Tailscale sign-in rather than embedding credentials', () => {
    expect(setup).toContain('Tailscale is installed but not signed in')
    expect(setup).not.toMatch(/authkey|tskey-/i)
    expect(setup).not.toMatch(/password\s*=/i)
  })

  it('resets Funnel when the bridge is stopped', () => {
    expect(stop).toContain('tailscale-funnel')
    expect(stop).toContain('funnel reset')
  })

  it('preserves the certification boundary', () => {
    expect(docs).toContain('does not create Model Arena runs, attestations, certification, or verified evidence')
    expect(docs).toContain('no separately purchased domain or DNS record is required')
  })
})
