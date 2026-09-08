import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const setup = readFileSync(resolve(root, 'astra-serving/windows/setup-blackstar-freellm-tailscale-funnel.ps1'), 'utf8')
const proxy = readFileSync(resolve(root, 'astra-serving/windows/blackstar-freellm-bearer-proxy.ps1'), 'utf8')

describe('Blackstar Windows FreeLLM evaluator bridge', () => {
  it('discovers the dynamic FreeLLM desktop listener by process ownership and /api/ping', () => {
    expect(setup).toContain("^FreeLLMAPI\\.exe$")
    expect(setup).toContain('Get-NetTCPConnection -State Listen')
    expect(setup).toContain('/api/ping')
    expect(setup).toContain("[string]$ping.status -eq 'ok'")
    expect(setup).not.toContain('127.0.0.1:3001')
  })

  it('keeps the independent evaluator separate from the native Qwen Funnel', () => {
    expect(setup).toContain('[int]$HttpsPort = 8443')
    expect(setup).toContain('FREELLMAPI_BASE_URL=$publicBase/v1')
    expect(setup).toContain('FREELLMAPI_API_KEY=<Blackstar bridge token copied to clipboard; value intentionally not printed>')
    expect(setup).toContain('FREELLMAPI_MODEL=$Model')
    expect(setup).not.toContain('OPENAI_COMPATIBLE_BASE_URL=')
    expect(setup).not.toContain('BLACKSTAR_NATIVE_PRIMARY=')
  })

  it('never prints or accepts the FreeLLM unified key on the command line', () => {
    expect(setup).toContain("Read-Host 'Paste the FreeLLMAPI unified key (input is hidden)' -AsSecureString")
    expect(setup).toContain("'freellm-key.clixml'")
    expect(setup).toContain('Export-Clixml')
    expect(setup).not.toMatch(/Write-Host[^\n]*upstreamKey/i)
    expect(proxy).toContain('Import-Clixml')
  })

  it('publishes only the OpenAI-compatible judge endpoints behind a separate bearer token', () => {
    expect(proxy).toContain("$path -eq '/v1/models'")
    expect(proxy).toContain("$path -eq '/v1/chat/completions'")
    expect(proxy).toContain("$auth -ne \"Bearer $bridgeToken\"")
    expect(proxy).toContain("AuthenticationHeaderValue('Bearer', $upstreamKey)")
  })

  it('pins the concrete independent evaluator model rather than auto or fusion', () => {
    expect(setup).toContain("[string]$Model = 'nvidia/nemotron-3-super-120b-a12b:free'")
    expect(setup).toContain("the pinned evaluator model '$Model' was not returned")
  })
})
