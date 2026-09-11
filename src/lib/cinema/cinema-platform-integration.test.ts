import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const sidebar=readFileSync('src/components/palladium/Sidebar.jsx','utf8')
const registry=readFileSync('src/lib/runtime/tools.server.ts','utf8')
const tool=readFileSync('src/lib/cinema/cinema-agent-tool.server.ts','utf8')

describe('Cinema Studio platform integration',()=>{
  it('adds Cinema Studio as a first-class Blackstar workspace destination',()=>{
    expect(sidebar).toContain("['Cinema Studio', '/cinema-studio'")
  })
  it('registers the bounded Cinema tool through the existing Harness/audit registry',()=>{
    expect(registry).toContain('CINEMA_STUDIO_TOOL_DEF')
    expect(registry).toContain('runCinemaStudioTool')
    expect(registry).toContain('"cinema_studio"')
  })
  it('limits agent actions to development, compilation and readiness auditing',()=>{
    expect(tool).toContain("enum:['capabilities','list_projects','develop_project','compile_production','compile_scene','audit_master']")
    expect(tool).not.toContain("'submit_master'")
    expect(tool).not.toContain("'render_film'")
  })
  it('uses the same production and assembly logic as the operator UI',()=>{
    expect(tool).toContain('generateCinemaProductionManifest')
    expect(tool).toContain('generateCinemaShotPlan')
    expect(tool).toContain('buildCinemaAssemblyManifest')
  })
})
