import { describe, expect, it } from 'vitest'
import { createPalladiumAiHubRegistry } from '../registry'
import { toAiHubComputeResource, toAiHubDatasetResource, toAiHubMarketplaceAgentResource } from '../resources'

describe('AI Hub provider identity', () => {
  it('registers every stable inventory provider used by marketplace, data and compute resources', () => {
    const registry = createPalladiumAiHubRegistry()
    const resources = [
      toAiHubMarketplaceAgentResource({ id: 'listing-1', title: 'Agent', status: 'published' }),
      toAiHubDatasetResource({ id: 'table-1', name: 'Dataset', fields: [] }),
      toAiHubComputeResource({ id: 'target-1', name: 'Compute', provider: 'coolify' }),
    ]

    for (const resource of resources) {
      expect(registry.getProvider(resource.providerId), resource.providerId).toBeDefined()
    }
  })

  it('marks discovery-only providers explicitly instead of implying an execution adapter exists', () => {
    const registry = createPalladiumAiHubRegistry()
    for (const id of ['palladium-marketplace', 'palladium-smart-tables', 'palladium-compute']) {
      expect(registry.getProvider(id)?.metadata?.['execution']).toBe('discovery-only')
    }
  })
})
