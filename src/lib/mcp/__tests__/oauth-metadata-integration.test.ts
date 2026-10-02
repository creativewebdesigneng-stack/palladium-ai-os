import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const mcp = readFileSync('src/lib/mcp/index.ts','utf8')
const config = readFileSync('src/lib/mcp/oauth-config.ts','utf8')
const route = readFileSync('src/routes/[.well-known]/oauth-protected-resource.ts','utf8')

describe('Blackstar MCP OAuth metadata contract', () => {
  it('builds the issuer from a validated project ref rather than project-ref-unset', () => {
    expect(mcp).toContain('runtimeMcpSupabaseProjectRef')
    expect(mcp).toContain('https://${projectRef}.supabase.co/auth/v1')
    expect(mcp).not.toContain('project-ref-unset')
    expect(config).toContain('SUPABASE_URL')
    expect(config).toContain('piwhiuangitqvwvwwcga')
  })

  it('keeps the protected-resource route on the canonical Blackstar MCP endpoint', () => {
    expect(route).toContain('resourcePath: "/mcp"')
    expect(route).toContain('metadataPath: "/.well-known/oauth-protected-resource"')
  })
})
