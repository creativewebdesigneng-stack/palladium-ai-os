import { describe, expect, it } from 'vitest'
import { deriveAstraCognitiveAwareness } from '../astra-cognitive-awareness'
import type { AiHubLiveResource } from '../resources'

function resource(kind: AiHubLiveResource['kind'], id: string, status = 'available', capabilities: string[] = [], metadata: Record<string, string> = {}): AiHubLiveResource {
  return { kind, id, name: id, providerId: 'blackstar-existing', status, capabilities, metadata }
}
const sample: AiHubLiveResource[] = [
  resource('model', 'provider-model'),
  resource('agent', 'agent-a', 'active', ['web_search', 'github_write', 'three_d_studio']),
  resource('agent', 'agent-b', 'active', ['browser_task']),
  resource('workflow', 'workflow-a', 'active'),
  resource('dataset', 'dataset-a'),
  resource('image', 'image-a'),
  resource('video', 'video-a'),
]

describe('Astra cognitive awareness uses canonical resource evidence without inventing ability', () => {
  it('reports configured lanes as registered but NEVER benchmark certified', () => {
    const snapshot = deriveAstraCognitiveAwareness({
      resources: sample, inventoryKnown: true, controlKnown: true,
      controlPlane: { control: { enabled: true }, health: { staleWorkflowRuns: 0, schedulerErrors: 0 } },
    })
    expect(snapshot.lanes.map((lane) => lane.state)).toEqual(Array(9).fill('registered-unverified'))
    expect(snapshot.autonomy).toBe('no-stop-reported')
    expect(snapshot.availableLaneCount).toBe(9)
    expect(JSON.stringify(snapshot)).not.toContain('"certified"')
  })

  it('does not treat enabled skills or disabled agent tools as executable grants', () => {
    const snapshot = deriveAstraCognitiveAwareness({
      inventoryKnown: true, controlKnown: false, resources: [
        resource('tool', 'website-skill', 'enabled', ['web_search', 'browser_task', 'github_write', 'three_d_studio'], { resourceType: 'skill' }),
        resource('agent', 'disabled-agent', 'disabled', ['web_search']),
        resource('image', 'unconfigured-image', 'unconfigured'),
      ],
    })
    for (const id of ['web-research', 'browser', 'coding', '3d', 'image']) {
      expect(snapshot.lanes.find((lane) => lane.id === id)?.state).toBe('not-registered')
    }
    expect(snapshot.availableLaneCount).toBe(0)
  })

  it('keeps missing owner-scoped inventory and missing autonomous health unknown', () => {
    const snapshot = deriveAstraCognitiveAwareness({ inventoryKnown: false, controlKnown: false })
    expect(snapshot.lanes.every((lane) => lane.state === 'unknown')).toBe(true)
    expect(snapshot.autonomy).toBe('unknown')
  })

  it('distinguishes master stop, real scheduler alerts and incomplete health data', () => {
    const base = { inventoryKnown: true, resources: sample, controlKnown: true }
    expect(deriveAstraCognitiveAwareness({ ...base, controlPlane: { control: { enabled: false } } }).autonomy).toBe('stopped')
    expect(deriveAstraCognitiveAwareness({ ...base, controlPlane: {
      control: { enabled: true }, health: { staleWorkflowRuns: 1, schedulerErrors: 0 },
    } }).autonomy).toBe('needs-attention')
    expect(deriveAstraCognitiveAwareness({ ...base, controlPlane: {
      control: { enabled: true },
    } }).autonomy).toBe('unknown')
  })

  it('does not equate a single agent with proven multi-agent execution', () => {
    const snapshot = deriveAstraCognitiveAwareness({
      inventoryKnown: true, controlKnown: false, resources: [
        resource('agent', 'one', 'active', ['web_fetch']),
        resource('workflow', 'one-workflow', 'active'),
      ],
    })
    expect(snapshot.lanes.find((lane) => lane.id === 'agents')?.state).toBe('not-registered')
    expect(snapshot.lanes.find((lane) => lane.id === 'web-research')?.state).toBe('registered-unverified')
  })
})
