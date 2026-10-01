import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const apiManagement = readFileSync(
  new URL('../../../components/models/APIManagement.jsx', import.meta.url),
  'utf8',
)
const credentialsFunctions = readFileSync(
  new URL('../model-provider-credentials.functions.ts', import.meta.url),
  'utf8',
)
const credentialsServer = readFileSync(
  new URL('../model-provider-credentials.server.ts', import.meta.url),
  'utf8',
)
const gatewayBase = readFileSync(
  new URL('../model-gateway.base.ts', import.meta.url),
  'utf8',
)
const mcp = readFileSync(
  new URL('../../mcp/index.ts', import.meta.url),
  'utf8',
)

describe('Blackstar external AI connection contract', () => {
  it('uses real server functions instead of the old mock API key catalogue', () => {
    expect(apiManagement).toContain('listModelProviderConnections')
    expect(apiManagement).toContain('saveModelProviderConnection')
    expect(apiManagement).toContain('testModelProviderConnection')
    expect(apiManagement).toContain('deleteModelProviderConnection')
    expect(apiManagement).toContain('type="password"')
    expect(apiManagement).not.toContain('API_KEYS')
  })

  it('keeps secret persistence and decryption behind server-only boundaries', () => {
    expect(credentialsFunctions).toContain("await import('./model-provider-credentials.server')")
    expect(credentialsFunctions).not.toMatch(/^import \{[^\n]*decryptToken/m)
    expect(credentialsServer).toContain('encryptToken(key)')
    expect(credentialsServer).toContain('decryptToken(String(data.api_key_ciphertext))')
    expect(credentialsServer).toContain("from('model_provider_credentials')")
  })

  it('binds personal credentials to their matching provider only', () => {
    expect(gatewayBase).toContain('access?.provider === provider')
    expect(gatewayBase).toContain('personalKey || process.env["OPENAI_API_KEY"]')
    expect(gatewayBase).toContain('personalKey || process.env["ANTHROPIC_API_KEY"]')
  })

  it('exposes Blackstar—not the legacy product identity—to MCP clients', () => {
    expect(mcp).toContain('name: "blackstar"')
    expect(mcp).toContain('title: "Blackstar"')
    expect(mcp).not.toContain('title: "PalladiumAI"')
  })
})
