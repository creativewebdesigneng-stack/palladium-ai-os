import { describe, expect, it } from 'vitest'
import { countAiHubResources, toAiHubDatasetResource } from '../resources'

describe('AI Hub Smart Tables dataset mapping', () => {
  it('projects dataset schema metadata without exposing record contents or user identity', () => {
    const resource = toAiHubDatasetResource({
      id: 'dataset-1',
      name: 'Customer Accounts',
      description: 'Structured customer account data.',
      fields: [
        { key: 'name', name: 'Name', type: 'text' },
        { key: 'value', name: 'Value', type: 'number' },
        { key: 'email', name: 'Email', type: 'email' },
      ],
      default_view: 'grid',
      created_at: '2026-09-01T20:00:00Z',
      updated_at: '2026-09-01T20:10:00Z',
      user_id: 'private-user-id',
      records: [{ values: { email: 'private@example.com', token: 'secret' } }],
    })

    expect(resource).toEqual({
      id: 'dataset-1',
      kind: 'dataset',
      name: 'Customer Accounts',
      status: 'available',
      providerId: 'palladium-smart-tables',
      capabilities: ['structured-data', 'schema-defined'],
      metadata: {
        resourceType: 'smart-table',
        source: 'smart-tables',
        description: 'Structured customer account data.',
        fieldCount: '3',
        fieldTypes: 'text, number, email',
        defaultView: 'grid',
        createdAt: '2026-09-01T20:00:00Z',
        updatedAt: '2026-09-01T20:10:00Z',
      },
    })

    const serialized = JSON.stringify(resource)
    expect(serialized).not.toContain('private-user-id')
    expect(serialized).not.toContain('private@example.com')
    expect(serialized).not.toContain('secret')
  })

  it('counts datasets separately', () => {
    const dataset = toAiHubDatasetResource({ id: 'dataset-1', name: 'Dataset' })
    expect(countAiHubResources([dataset])).toEqual({
      models: 0,
      agents: 0,
      tools: 0,
      mcp: 0,
      apps: 0,
      datasets: 1,
      compute: 0,
      skills: 0,
      marketplace: 0,
      workflows: 0,
      total: 1,
    })
  })
})
