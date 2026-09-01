import { describe, expect, it } from 'vitest'
import { toAiHubCommercialSummary } from '../commercial'

describe('AI Hub commercial governance projection', () => {
  it('projects plan, limits and usage without payment identifiers or feature names', () => {
    const summary = toAiHubCommercialSummary({
      planCode: 'business',
      planName: 'Business',
      status: 'active',
      limits: { agents: 25, tasks_per_month: 10000, seats: 10, storage_mb: 50000 },
      features: ['private-feature-a', 'private-feature-b'],
      usage: { agents: 7, tasksThisMonth: 321, seats: 4 },
      currentPeriodEnd: '2026-10-01T00:00:00.000Z',
      cancelAtPeriodEnd: false,
      isPlatformAdmin: false,
    })

    expect(summary).toEqual({
      planCode: 'business',
      planName: 'Business',
      status: 'active',
      featureCount: 2,
      limits: { agents: 25, tasksPerMonth: 10000, seats: 10, storageMb: 50000 },
      usage: { agents: 7, tasksThisMonth: 321, seats: 4 },
      currentPeriodEnd: '2026-10-01T00:00:00.000Z',
      cancelAtPeriodEnd: false,
      platformAdmin: false,
    })

    const serialized = JSON.stringify(summary)
    expect(serialized).not.toContain('private-feature-a')
    expect(serialized).not.toContain('stripe')
    expect(serialized).not.toContain('customer')
    expect(serialized).not.toContain('payment')
  })
})
