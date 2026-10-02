import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  ACQUISITION_OUTCOME_PACKS,
  OUTCOME_PACKS,
  PREMIUM_OUTCOME_PACKS,
  getOutcomePack,
} from '../outcome-packs'

const functions = readFileSync(new URL('../outcome-packs.functions.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('../../../screens/OutcomePacks.jsx', import.meta.url), 'utf8')
const navigation = readFileSync(new URL('../../../components/palladium/navigationData.jsx', import.meta.url), 'utf8')

describe('Blackstar Outcome Packs', () => {
  it('ships exactly twenty acquisition and twenty premium-value packs', () => {
    expect(OUTCOME_PACKS).toHaveLength(40)
    expect(ACQUISITION_OUTCOME_PACKS).toHaveLength(20)
    expect(PREMIUM_OUTCOME_PACKS).toHaveLength(20)
    expect(new Set(OUTCOME_PACKS.map((pack) => pack.id)).size).toBe(40)
  })

  it('maps every pack to a real Blackstar route and a substantive governed request', () => {
    for (const pack of OUTCOME_PACKS) {
      expect(pack.launchRoute).toMatch(/^\/[a-z0-9-]+$/)
      expect(pack.requestTemplate.length).toBeGreaterThan(80)
      expect(pack.value.length).toBeGreaterThan(20)
      expect(pack.name.length).toBeGreaterThan(4)
    }
    expect(getOutcomePack('cinema-production-pipeline')?.launchRoute).toBe('/cinema-studio')
    expect(getOutcomePack('missing')).toBeNull()
  })

  it('enforces premium eligibility on the server rather than trusting the browser', () => {
    expect(functions).toContain("pack.tier === 'premium'")
    expect(functions).toContain("entitlements.planCode === 'explorer'")
    expect(functions).toContain("from('personal_tasks')")
    expect(functions).toContain('requires_approval: pack.involvesMoney')
    expect(functions).toContain('outcome_pack.launched')
    expect(functions).toContain("metric: 'outcome_pack_launch'")
  })

  it('launches into normal Mission Control governance instead of bypassing execution controls', () => {
    expect(functions).toContain('Respect Blackstar approvals, tool permissions, budget controls')
    expect(functions).toContain('/mission-control?task=')
    expect(screen).toContain('Launch mission')
    expect(screen).toContain('Open workspace')
  })

  it('keeps the forty-pack workspace discoverable through Blackstar navigation', () => {
    expect(navigation).toContain("{ label: 'Outcome Packs', path: '/outcomes', icon: Sparkles }")
    expect(screen).toContain('40')
    expect(screen).toContain('20')
  })
})
