import { describe, expect, it } from 'vitest'
import { AiHubRuntimeTargetRegistry, requiresRuntimeTargetAttestation } from '../runtime-targets'

describe('AI Hub portable runtime target attestations', () => {
  it('requires attestations only for customer-controlled portable targets', () => {
    expect(requiresRuntimeTargetAttestation('palladium-cloud')).toBe(false)
    expect(requiresRuntimeTargetAttestation('provider-cloud')).toBe(false)
    expect(requiresRuntimeTargetAttestation('customer-cloud')).toBe(true)
    expect(requiresRuntimeTargetAttestation('on-prem')).toBe(true)
    expect(requiresRuntimeTargetAttestation('edge')).toBe(true)
    expect(requiresRuntimeTargetAttestation('device')).toBe(true)
  })

  it('resolves only a healthy, unexpired target for the same tenant and region', () => {
    const registry = new AiHubRuntimeTargetRegistry()
    registry.register({
      id: 'tenant-a-onprem',
      deploymentTarget: 'on-prem',
      tenantId: 'tenant-a',
      region: 'uk',
      health: 'healthy',
      attestedAt: '2026-10-01T18:00:00.000Z',
      expiresAt: '2026-10-02T18:00:00.000Z',
    })
    registry.register({
      id: 'tenant-b-onprem',
      deploymentTarget: 'on-prem',
      tenantId: 'tenant-b',
      region: 'uk',
      health: 'healthy',
      attestedAt: '2026-10-01T19:00:00.000Z',
      expiresAt: '2026-10-02T18:00:00.000Z',
    })

    expect(registry.resolve({
      tenantId: 'tenant-a',
      deploymentTarget: 'on-prem',
      region: 'uk',
      now: new Date('2026-10-01T20:00:00.000Z'),
    })?.id).toBe('tenant-a-onprem')

    expect(registry.resolve({
      tenantId: 'tenant-a',
      deploymentTarget: 'on-prem',
      region: 'eu',
      now: new Date('2026-10-01T20:00:00.000Z'),
    })).toBeNull()
  })

  it('invalidates an attestation after target configuration or secret rotation changes', () => {
    const registry = new AiHubRuntimeTargetRegistry()
    registry.register({
      id: 'rotated-onprem',
      deploymentTarget: 'on-prem',
      tenantId: 'tenant-a',
      region: 'uk',
      health: 'healthy',
      attestedAt: '2026-10-01T18:00:00.000Z',
      expiresAt: '2026-10-01T22:00:00.000Z',
      configurationUpdatedAt: '2026-10-01T19:00:00.000Z',
    })

    expect(registry.resolve({
      tenantId: 'tenant-a',
      deploymentTarget: 'on-prem',
      region: 'uk',
      now: new Date('2026-10-01T20:00:00.000Z'),
    })).toBeNull()
  })

  it('fails closed for degraded, offline or expired targets', () => {
    const registry = new AiHubRuntimeTargetRegistry()
    registry.register({
      id: 'degraded-edge',
      deploymentTarget: 'edge',
      tenantId: 'tenant-a',
      health: 'degraded',
      attestedAt: '2026-10-01T18:00:00.000Z',
    })
    registry.register({
      id: 'expired-device',
      deploymentTarget: 'device',
      tenantId: 'tenant-a',
      health: 'healthy',
      attestedAt: '2026-09-30T18:00:00.000Z',
      expiresAt: '2026-10-01T18:00:00.000Z',
    })

    expect(registry.resolve({
      tenantId: 'tenant-a',
      deploymentTarget: 'edge',
      now: new Date('2026-10-01T20:00:00.000Z'),
    })).toBeNull()

    expect(registry.resolve({
      tenantId: 'tenant-a',
      deploymentTarget: 'device',
      now: new Date('2026-10-01T20:00:00.000Z'),
    })).toBeNull()
  })
})
