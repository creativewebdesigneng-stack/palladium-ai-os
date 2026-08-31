import { describe, expect, it } from 'vitest'
import { discoverAiHubCapabilities } from '../discovery'
import type { AiHubCapabilityRef } from '../contracts'

const capabilities: AiHubCapabilityRef[] = [
  { id: 'coding-private', kind: 'model', providerId: 'gateway', name: 'Private Code Model', capabilities: ['code', 'reasoning'], deploymentTargets: ['on-prem'], regions: ['uk'] },
  { id: 'image-public', kind: 'image', providerId: 'gateway', name: 'Image Creator', capabilities: ['image-generation'], deploymentTargets: ['provider-cloud'], regions: ['us'] },
]

describe('AI Hub discovery', () => {
  it('discovers by capability and deployment policy', () => {
    const results = discoverAiHubCapabilities(capabilities, { capabilities: ['code'], deploymentTargets: ['on-prem'] })
    expect(results.map((result) => result.capability.id)).toEqual(['coding-private'])
  })

  it('filters by provider, kind and region', () => {
    const results = discoverAiHubCapabilities(capabilities, { providerIds: ['gateway'], kinds: ['image'], regions: ['us'] })
    expect(results[0]?.capability.id).toBe('image-public')
  })

  it('returns no result when requirements cannot be satisfied', () => {
    expect(discoverAiHubCapabilities(capabilities, { capabilities: ['voice'] })).toEqual([])
  })
})
