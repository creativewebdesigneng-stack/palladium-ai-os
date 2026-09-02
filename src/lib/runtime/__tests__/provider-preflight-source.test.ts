import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(
  join(process.cwd(), 'src/lib/runtime/runtime.server.ts'),
  'utf8',
)

describe('agent provider configuration preflight', () => {
  it('checks the resolved provider before opening an agent task', () => {
    const providerResolution = source.indexOf('const provider = normaliseProvider(agent.model_provider)')
    const providerGuard = source.indexOf('if (!isProviderConfigured(provider))')
    const taskInsert = source.indexOf('const { data: task, error } = await args.sb', providerGuard)
    const activityInsert = source.indexOf('.from("agent_activities").insert', providerGuard)
    const startedNotification = source.indexOf('type: "agent.started"', providerGuard)

    expect(providerResolution).toBeGreaterThan(-1)
    expect(providerGuard).toBeGreaterThan(providerResolution)
    expect(taskInsert).toBeGreaterThan(providerGuard)
    expect(activityInsert).toBeGreaterThan(taskInsert)
    expect(startedNotification).toBeGreaterThan(activityInsert)
  })

  it('returns a safe 503 configuration error without silent provider failover', () => {
    const providerGuard = source.indexOf('if (!isProviderConfigured(provider))')
    const taskInsert = source.indexOf('const { data: task, error } = await args.sb', providerGuard)
    const preflight = source.slice(providerGuard, taskInsert)

    expect(preflight).toContain('"PROVIDER_NOT_CONFIGURED"')
    expect(preflight).toContain('503')
    expect(preflight).toContain('select another configured provider')
    expect(preflight).not.toMatch(/fallback|normaliseProvider\([^)]*groq|normaliseProvider\([^)]*lovable/i)
  })
})
