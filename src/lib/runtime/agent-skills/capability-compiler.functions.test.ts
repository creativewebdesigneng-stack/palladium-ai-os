import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = readFileSync(resolve(process.cwd(), 'src/lib/runtime/agent-skills/agent-skills.functions.ts'), 'utf8')

describe('installed skill capability compiler boundary', () => {
  it('keeps compilation owner-scoped and server-derived', () => {
    expect(source).toContain('.eq("user_id", context.userId)')
    expect(source).toContain('.from("tools")')
    expect(source).toContain('createPalladiumAiHubRegistry()')
    expect(source).toContain('compileAgentSkillCapability(prepared')
  })

  it('returns only the compiled contract and safe inventory counts', () => {
    expect(source).toContain('skillId: skill.id')
    expect(source).toContain('compiled,')
    expect(source).toContain('toolCount: toolSlugs.length')
    expect(source).toContain('providerCount: providers.length')
    expect(source).not.toContain('return { skillId: skill.id, files')
  })
})
