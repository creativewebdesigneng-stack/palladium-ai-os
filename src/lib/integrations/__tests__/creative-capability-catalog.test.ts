import { describe, expect, it } from 'vitest'
import { capabilityProfile, PROVIDER_CAPABILITY_PROFILES } from '../capability-catalog'

describe('creative intelligence capability providers', () => {
  it('declares the core creative connector targets without claiming live execution', () => {
    for (const id of ['canva', 'huggingface', 'figma', 'adobe', 'runway', 'higgsfield']) {
      const profile = capabilityProfile(id)
      expect(profile).toBeDefined()
      expect(profile?.families.some((family) => ['creative_design', 'media_generation', 'three_d'].includes(family))).toBe(true)
      expect(profile?.status).toBe('planned')
    }
  })

  it('registers the verified cross-platform provider target set without claiming live execution', () => {
    for (const id of [
      'vercel', 'supabase', 'lovable', 'webflow', 'heygen', 'semrush', 'metricool',
      'airtable', 'coda', 'dropbox', 'sharepoint', 'amplitude', 'posthog',
    ]) {
      const profile = capabilityProfile(id)
      expect(profile, id).toBeDefined()
      expect(profile?.status, id).toBe('planned')
      expect(profile?.preferredLanes.length, id).toBeGreaterThan(0)
      expect(profile?.notes?.length, id).toBeGreaterThan(0)
    }
  })

  it('keeps provider identifiers unique', () => {
    const ids = PROVIDER_CAPABILITY_PROFILES.map((profile) => profile.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
