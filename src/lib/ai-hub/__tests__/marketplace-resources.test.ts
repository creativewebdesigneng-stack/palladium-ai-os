import { describe, expect, it } from 'vitest'
import { countAiHubResources, toAiHubMarketplaceAgentResource } from '../resources'

describe('AI Hub marketplace resource mapping', () => {
  it('projects a published listing without executable or review metadata', () => {
    const resource = toAiHubMarketplaceAgentResource({
      id: 'listing-1',
      title: 'Store Operator',
      summary: 'Runs routine store operations.',
      description: 'Long public description.',
      category: 'ecommerce',
      tags: ['shopify', 'orders'],
      price_pence: 1999,
      currency: 'GBP',
      version: '2.1.0',
      required_plan: 'business',
      install_count: 42,
      rating_avg: 4.8,
      rating_count: 12,
      published_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:10:00Z',
      metadata: { agent_config: { system_prompt: 'must-never-leak', api_key: 'secret' } },
      review_notes: 'private moderator note',
      publisher_id: 'private-publisher-id',
    })

    expect(resource).toEqual({
      id: 'listing-1',
      kind: 'agent',
      name: 'Store Operator',
      status: 'published',
      providerId: 'palladium-marketplace',
      capabilities: ['shopify', 'orders'],
      metadata: {
        resourceType: 'marketplace-listing',
        source: 'marketplace',
        description: 'Runs routine store operations.',
        category: 'ecommerce',
        version: '2.1.0',
        requiredPlan: 'business',
        pricePence: '1999',
        currency: 'GBP',
        installCount: '42',
        rating: '4.8',
        ratingCount: '12',
        publishedAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:10:00Z',
      },
    })

    const serialized = JSON.stringify(resource)
    expect(serialized).not.toContain('must-never-leak')
    expect(serialized).not.toContain('secret')
    expect(serialized).not.toContain('private moderator note')
    expect(serialized).not.toContain('private-publisher-id')
  })

  it('counts marketplace listings separately while retaining agent totals', () => {
    const listing = toAiHubMarketplaceAgentResource({ id: 'listing-1', title: 'Agent' })
    expect(countAiHubResources([listing])).toEqual({
      models: 0,
      agents: 1,
      tools: 0,
      mcp: 0,
      apps: 0,
      datasets: 0,
      compute: 0,
      skills: 0,
      marketplace: 1,
      workflows: 0,
      total: 1,
    })
  })
})
