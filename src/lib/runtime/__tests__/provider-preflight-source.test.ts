import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(
  join(process.cwd(), 'src/lib/runtime/runtime.server.ts'),
  'utf8',
)

const prepareRunStart = source.indexOf('export async function prepareRun(')
const prepareRunEnd = source.indexOf('\nasync function admin()', prepareRunStart)
const prepareRunSource = source.slice(prepareRunStart, prepareRunEnd)

describe('agent provider configuration preflight', () => {
  it('checks the resolved provider before the first agent task write', () => {
    expect(prepareRunStart).toBeGreaterThan(-1)
    expect(prepareRunEnd).toBeGreaterThan(prepareRunStart)

    const providerResolution = prepareRunSource.indexOf(
      'const provider = normaliseProvider(agent.model_provider)',
    )
    const providerGuard = prepareRunSource.indexOf('if (!isProviderConfigured(provider))')
    const taskWrite = prepareRunSource.indexOf('.from("agent_tasks")', providerGuard)

    expect(providerResolution).toBeGreaterThan(-1)
    expect(providerGuard).toBeGreaterThan(providerResolution)
    expect(taskWrite).toBeGreaterThan(providerGuard)
  })

  it('returns a safe 503 configuration error without silent provider failover', () => {
    const providerGuard = prepareRunSource.indexOf('if (!isProviderConfigured(provider))')
    const taskWrite = prepareRunSource.indexOf('.from("agent_tasks")', providerGuard)
    const preflight = prepareRunSource.slice(providerGuard, taskWrite)

    expect(providerGuard).toBeGreaterThan(-1)
    expect(taskWrite).toBeGreaterThan(providerGuard)
    expect(preflight).toContain('"PROVIDER_NOT_CONFIGURED"')
    expect(preflight).toContain('503')
    expect(preflight).toContain('select another configured provider')
    expect(preflight).not.toMatch(/fallback|normaliseProvider\([^)]*groq|normaliseProvider\([^)]*lovable/i)
  })
})
