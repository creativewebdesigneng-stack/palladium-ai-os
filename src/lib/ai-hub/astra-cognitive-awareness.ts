import type { AiHubLiveResource } from './resources'

export type AstraAwarenessState = 'unknown' | 'registered-unverified' | 'not-registered'
export type AstraAwarenessLaneId =
  | 'reasoning' | 'web-research' | 'browser' | 'coding'
  | 'agents' | 'knowledge' | 'image' | 'video' | '3d'

export interface AstraAwarenessLane {
  id: AstraAwarenessLaneId
  name: string
  state: AstraAwarenessState
  registeredResources: number
  verificationBoundary: string
}

export type AstraAutonomyAwareness =
  | 'unknown' | 'stopped' | 'needs-attention' | 'no-stop-reported'

export type AstraControlPlaneHealth = {
  control?: { enabled?: boolean } | null
  health?: { staleWorkflowRuns?: number; schedulerErrors?: number } | null
}

/**
 * A truthful, read-only projection of the EXISTING owner-scoped AI Hub inventory
 * and Autonomous OS control plane. This never executes tools, fabricates
 * certification, probes credentials, or elevates permissions.
 *
 * "registered-unverified" means configured/discoverable only. It is deliberately
 * NOT proof of runtime health, authorization for this exact agent, model quality,
 * successful browsing, or independent frontier-model equivalence.
 */
export function deriveAstraCognitiveAwareness(args: {
  resources?: readonly AiHubLiveResource[] | null
  inventoryKnown: boolean
  controlPlane?: AstraControlPlaneHealth | null
  controlKnown: boolean
}): { lanes: AstraAwarenessLane[]; autonomy: AstraAutonomyAwareness; availableLaneCount: number } {
  const candidates = args.inventoryKnown ? (args.resources ?? []) : []
  const usableStatuses = new Set(['available', 'active', 'enabled', 'preview-ready', 'production'])
  const active = candidates.filter((r) => usableStatuses.has(r.status))
  const activeAgents = active.filter((r) => r.kind === 'agent')
  const activeWorkflows = active.filter((r) => r.kind === 'workflow')
  // Skills describe requirements rather than granting tools, so ignore them.
  // A granted agent tool is still only configuration, never execution evidence.
  const toolNames = new Set<string>()
  for (const r of active) {
    if (r.kind === 'agent') {
      for (const capability of r.capabilities ?? []) toolNames.add(capability.trim().toLowerCase())
    }
    if (r.kind === 'tool' && r.metadata?.['resourceType'] !== 'skill') {
      toolNames.add(r.id.trim().toLowerCase())
      for (const capability of r.capabilities ?? []) toolNames.add(capability.trim().toLowerCase())
    }
  }
  const hasTool = (...names: string[]) => names.some((name) => toolNames.has(name))
  const lane = (
    id: AstraAwarenessLaneId,
    name: string,
    count: number,
    verificationBoundary: string,
  ): AstraAwarenessLane => ({
    id, name,
    state: !args.inventoryKnown ? 'unknown' : count > 0 ? 'registered-unverified' : 'not-registered',
    registeredResources: args.inventoryKnown ? count : 0,
    verificationBoundary,
  })
  const countKind = (kind: AiHubLiveResource['kind']) => active.filter((r) => r.kind === kind).length

  const lanes: AstraAwarenessLane[] = [
    lane('reasoning', 'Reasoning models', countKind('model'),
      'Configured inference is not a qualified reasoning benchmark or a working model probe.'),
    lane('web-research', 'Deep web research', Number(hasTool('web_search', 'web_fetch')),
      'A registered web tool is not proof of open-web coverage, trusted sources, or a completed research task.'),
    lane('browser', 'Browser operation', Number(hasTool('browser', 'browser_task')),
      'Browser permissions, worker health, destination policy and real navigation require separate checks.'),
    lane('coding', 'Software engineering', Number(hasTool('github_write', 'agent_workspace', 'skill_script', 'app_studio')),
      'Tool configuration is not proof of coding quality, CI success or permission to write a repository.'),
    lane('agents', 'Multi-agent coordination', activeAgents.length >= 2 && activeWorkflows.length > 0 ? activeAgents.length : 0,
      'The orchestrator must confirm each granted agent, approval, persisted result and dependent task.'),
    lane('knowledge', 'Structured knowledge', countKind('dataset'),
      'A registered dataset is not verified global knowledge or permission to read individual records.'),
    lane('image', 'Image generation', countKind('image'),
      'Provider presence is not proof that image generation, rights checks or output quality passed.'),
    lane('video', 'Video generation', countKind('video'),
      'Video providers may need paid capacity, workers, segments and export certification.'),
    lane('3d', '3D asset creation', Number(hasTool('three_d_studio', 'voxel_studio')),
      'A studio grant does not prove a working 3D worker, GTA V conversion or a completed export.'),
  ]
  let autonomy: AstraAutonomyAwareness = 'unknown'
  if (args.controlKnown && args.controlPlane?.control) {
    if (args.controlPlane.control.enabled === false) autonomy = 'stopped'
    else if (args.controlPlane.control.enabled === true) {
      const health = args.controlPlane.health
      const stale = health?.staleWorkflowRuns
      const errors = health?.schedulerErrors
      autonomy = typeof stale !== 'number' || typeof errors !== 'number'
        ? 'unknown'
        : stale > 0 || errors > 0 ? 'needs-attention' : 'no-stop-reported'
    }
  }
  return {
    lanes,
    autonomy,
    availableLaneCount: lanes.filter((item) => item.state === 'registered-unverified').length,
  }
}
