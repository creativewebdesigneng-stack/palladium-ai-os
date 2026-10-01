import type { AiHubDeploymentTarget } from './contracts'
import { AiHubRuntimeTargetRegistry } from './runtime-targets'

type Sb = { from: (table: string) => any }

type RuntimeTargetRow = {
  id: string
  user_id: string
  org_id?: string | null
  deployment_target: AiHubDeploymentTarget
  region?: string | null
  health: 'healthy' | 'degraded' | 'offline'
  attested_at?: string | null
  expires_at?: string | null
  updated_at: string
  metadata?: Record<string, unknown> | null
}

export async function loadAiHubRuntimeTargetRegistry(
  sb: Sb,
  tenantId: string,
): Promise<AiHubRuntimeTargetRegistry> {
  const { data, error } = await sb
    .from('ai_hub_runtime_targets')
    .select('id,user_id,org_id,deployment_target,region,health,attested_at,expires_at,updated_at,metadata')
    .is('revoked_at', null)

  if (error) throw new Error(error.message)

  const registry = new AiHubRuntimeTargetRegistry()
  for (const raw of (data ?? []) as RuntimeTargetRow[]) {
    const rowTenantId = raw.org_id ?? raw.user_id
    if (rowTenantId !== tenantId || !raw.attested_at) continue

    registry.register({
      id: raw.id,
      tenantId: rowTenantId,
      deploymentTarget: raw.deployment_target,
      ...(raw.region ? { region: raw.region } : {}),
      health: raw.health,
      attestedAt: raw.attested_at,
      ...(raw.expires_at ? { expiresAt: raw.expires_at } : {}),
      configurationUpdatedAt: raw.updated_at,
      ...(raw.metadata ? { metadata: raw.metadata } : {}),
    })
  }

  return registry
}
