import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { PALLADIUM_MCP_SERVER, PALLADIUM_MCP_TOOLS } from '../catalog'

type ManifestTool = {
  name: string
  title?: string
  description?: string
  annotations?: { readOnlyHint?: boolean }
}

const manifest = JSON.parse(
  readFileSync(join(process.cwd(), '.lovable/mcp/manifest.json'), 'utf8'),
) as {
  path: string
  auth: { type: string }
  mcp: { server: { name: string; title: string; version: string }; tools: ManifestTool[] }
}

describe('bundled MCP catalogue parity with the generated MCP manifest', () => {
  it('describes the same server the MCP route actually serves', () => {
    expect(PALLADIUM_MCP_SERVER.name).toBe(manifest.mcp.server.name)
    expect(PALLADIUM_MCP_SERVER.title).toBe(manifest.mcp.server.title)
    expect(PALLADIUM_MCP_SERVER.version).toBe(manifest.mcp.server.version)
    expect(PALLADIUM_MCP_SERVER.resourcePath).toBe(manifest.path)
    expect(manifest.auth.type).toBe('oauth')
  })

  it('exposes exactly the live tool names, with no drift in either direction', () => {
    expect(PALLADIUM_MCP_TOOLS.map((tool) => tool.name).sort()).toEqual(
      manifest.mcp.tools.map((tool) => tool.name).sort(),
    )
  })

  it('reuses the live tool titles and descriptions rather than restating them', () => {
    for (const tool of manifest.mcp.tools) {
      const catalogued = PALLADIUM_MCP_TOOLS.find((item) => item.name === tool.name)
      expect(catalogued, `missing catalogue entry for ${tool.name}`).toBeDefined()
      if (tool.title) expect(catalogued?.title).toBe(tool.title)
      if (tool.description) expect(catalogued?.description).toBe(tool.description)
    }
  })

  it('classifies read-only tools consistently with their live annotations', () => {
    for (const tool of manifest.mcp.tools) {
      const catalogued = PALLADIUM_MCP_TOOLS.find((item) => item.name === tool.name)
      const readOnly = tool.annotations?.readOnlyHint === true
      expect(catalogued?.access === 'read', `access mismatch for ${tool.name}`).toBe(readOnly)
    }
  })
})
