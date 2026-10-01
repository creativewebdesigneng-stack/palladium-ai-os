import type { AiHubDeploymentTarget } from './contracts'

const PORTABLE_RUNTIME_TARGETS = new Set<AiHubDeploymentTarget>([
  'customer-cloud',
  'on-prem',
  'edge',
  'device',
])

export type AiHubRuntimeTargetHealth = 'healthy' | 'degraded' | 'offline'

export interface AiHubRuntimeTargetAttestation {
  id: string
  deploymentTarget: AiHubDeploymentTarget
  tenantId: string
  region?: string
  health: AiHubRuntimeTargetHealth
  attestedAt: string
  expiresAt?: string
  configurationUpdatedAt?: string
  metadata?: Record<string, unknown>
}

export function requiresRuntimeTargetAttestation(target: AiHubDeploymentTarget) {
  return PORTABLE_RUNTIME_TARGETS.has(target)
}

function parseTimestamp(value: string) {
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : null
}

export class AiHubRuntimeTargetRegistry {
  private readonly targets = new Map<string, AiHubRuntimeTargetAttestation>()

  register(target: AiHubRuntimeTargetAttestation) {
    if (!target.id.trim() || !target.tenantId.trim()) {
      throw new Error('AI Hub runtime target requires id and tenant identity')
    }
    if (!requiresRuntimeTargetAttestation(target.deploymentTarget)) {
      throw new Error('AI Hub runtime target attestation is only valid for portable execution targets')
    }
    if (parseTimestamp(target.attestedAt) === null) {
      throw new Error('AI Hub runtime target attestation timestamp is invalid')
    }
    if (target.expiresAt && parseTimestamp(target.expiresAt) === null) {
      throw new Error('AI Hub runtime target expiry timestamp is invalid')
    }
    if (target.configurationUpdatedAt && parseTimestamp(target.configurationUpdatedAt) === null) {
      throw new Error('AI Hub runtime target configuration timestamp is invalid')
    }
    this.targets.set(target.id, target)
    return target
  }

  list(tenantId?: string) {
    const values = [...this.targets.values()]
    return tenantId ? values.filter((target) => target.tenantId === tenantId) : values
  }

  resolve(input: {
    tenantId: string
    deploymentTarget: AiHubDeploymentTarget
    region?: string
    now?: Date
  }) {
    const now = (input.now ?? new Date()).getTime()
    const candidates = this.list(input.tenantId).filter((target) => {
      if (target.deploymentTarget !== input.deploymentTarget) return false
      if (input.region && target.region !== input.region) return false
      if (target.health !== 'healthy') return false
      const attestedAt = parseTimestamp(target.attestedAt)
      if (attestedAt === null || attestedAt > now) return false
      if (target.configurationUpdatedAt) {
        const configuredAt = parseTimestamp(target.configurationUpdatedAt)
        if (configuredAt === null || configuredAt > attestedAt) return false
      }
      if (target.expiresAt) {
        const expiresAt = parseTimestamp(target.expiresAt)
        if (expiresAt === null || expiresAt <= now) return false
      }
      return true
    })

    return candidates.sort((a, b) => Date.parse(b.attestedAt) - Date.parse(a.attestedAt))[0] ?? null
  }
}
