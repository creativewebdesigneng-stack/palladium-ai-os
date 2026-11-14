import { afterEach, describe, expect, it } from 'vitest'
import { assertCinemaGenerationLane, getCinemaGenerationLanes } from './cinema-providers.server'

const keys = ['FAL_KEY', 'FAL_API_KEY', 'FAL_API_TOKEN', 'SEEDREAM_WORKER_URL', 'SEEDREAM_PROVIDER', 'LTX_WORKER_URL', 'LTX_WORKER_TOKEN'] as const
const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]))

afterEach(() => {
  for (const key of keys) {
    const value = previous[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('Cinema generation lanes', () => {
  it('stays disabled when no keyframe or video provider is configured', () => {
    for (const key of keys) delete process.env[key]
    const lanes = getCinemaGenerationLanes()
    expect(lanes.seedream.configured).toBe(false)
    expect(lanes.ltx.configured).toBe(false)
    expect(lanes.seedream.provider).toBe('unconfigured')
    expect(lanes.ltx.disabledReason).toContain('FAL_KEY')
    expect(() => assertCinemaGenerationLane('ltx')).toThrow(/FAL_KEY|LTX_WORKER_URL/)
  })

  it('enables both paid lanes from FAL_KEY without printing the key', () => {
    for (const key of keys) delete process.env[key]
    process.env['FAL_KEY'] = 'test-fal-key-not-a-secret-call'
    const lanes = getCinemaGenerationLanes()
    expect(lanes.seedream.configured).toBe(true)
    expect(lanes.seedream.provider).toBe('direct')
    expect(lanes.ltx.configured).toBe(true)
    expect(lanes.ltx.provider).toBe('direct')
    expect(JSON.stringify(lanes)).not.toContain('test-fal-key-not-a-secret-call')
  })

  it('enables only the worker whose URL is set', () => {
    for (const key of keys) delete process.env[key]
    process.env['LTX_WORKER_URL'] = 'https://ltx.example.com'
    const lanes = getCinemaGenerationLanes()
    expect(lanes.seedream.configured).toBe(false)
    expect(lanes.ltx.configured).toBe(true)
    expect(lanes.ltx.provider).toBe('worker')
  })
})
