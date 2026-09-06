export type BlackstarAstraRunCapability =
  | 'adaptive_reasoning'
  | 'long_context'
  | 'structured_output'
  | 'tool_use'
  | 'browsing'
  | 'research'
  | 'computer_use'
  | 'coding'
  | 'artifact_creation'
  | 'vision'
  | 'multimodal_input'
  | 'memory'
  | 'external_integrations'
  | 'checkpointed_work'
  | 'long_running_work'
  | 'async_tools'
  | 'multi_agent'
  | 'mid_turn_steering'

export type BlackstarAstraRunCapabilityControl = {
  version: 1
  available: BlackstarAstraRunCapability[]
  unavailable_target_capabilities: string[]
}

const hasAny = (tools: Set<string>, names: string[]) => names.some((name) => tools.has(name))

/**
 * Reports what this exact Astra run can really use. It never creates grants;
 * availability is derived only from tool definitions already resolved by the
 * authoritative Blackstar runtime.
 */
export function buildBlackstarAstraRunCapabilityControl(
  toolNames: readonly string[],
): BlackstarAstraRunCapabilityControl {
  const tools = new Set(toolNames)
  const available = new Set<BlackstarAstraRunCapability>([
    'adaptive_reasoning',
    'long_context',
    'structured_output',
    'checkpointed_work',
    'long_running_work',
    'mid_turn_steering',
  ])

  if (tools.size) available.add('tool_use')
  if (hasAny(tools, ['web_search', 'web_fetch', 'browser', 'browser_task'])) available.add('browsing')
  if (hasAny(tools, ['web_search', 'web_fetch'])) available.add('research')
  if (hasAny(tools, ['browser', 'browser_task'])) available.add('computer_use')
  if (hasAny(tools, ['github_write', 'agent_workspace', 'skill_script', 'html_studio', 'app_studio'])) available.add('coding')
  if (hasAny(tools, ['agent_workspace', 'html_studio', 'app_studio', 'voxel_studio', 'three_d_studio', 'short_video'])) available.add('artifact_creation')
  if (tools.has('astra_vision')) {
    available.add('vision')
    available.add('multimodal_input')
  }
  if (tools.has('astra_async_workflow')) available.add('async_tools')
  if (tools.has('astra_orchestrate')) available.add('multi_agent')
  if (hasAny(tools, ['memory_search', 'memory_write'])) available.add('memory')
  if (hasAny(tools, ['integration_capabilities', 'integration_action', 'connected_service', 'connected_service_write', 'github_write', 'social_ops'])) {
    available.add('external_integrations')
  }

  const unavailable: string[] = []
  if (!available.has('artifact_creation')) unavailable.push('artifact_creation')
  if (!available.has('vision')) unavailable.push('vision')
  if (!available.has('multimodal_input')) unavailable.push('multimodal_input')
  if (!available.has('async_tools')) unavailable.push('async_tools')
  if (!available.has('multi_agent')) unavailable.push('multi_agent')
  // Hidden chain-of-thought persistence is intentionally never claimed. Blackstar
  // persists plans, verification state, checkpoints and bounded evidence instead.
  unavailable.push('persisted_hidden_reasoning')

  return {
    version: 1,
    available: [...available],
    unavailable_target_capabilities: unavailable,
  }
}

export function renderBlackstarAstraRunCapabilityControl(
  control: BlackstarAstraRunCapabilityControl,
): string {
  return [
    'BLACKSTAR ASTRA RUN CAPABILITIES',
    `Available now: ${control.available.join(', ') || 'none'}`,
    `Not available in this run: ${control.unavailable_target_capabilities.join(', ') || 'none'}`,
    'Capability rule: use only capabilities and tools already granted by the Blackstar runtime. This manifest reports authority; it never creates authority.',
    'Multimodal input means authenticated private image artifact ids are inspected through the owner-scoped Astra vision tool and converted to bounded untrusted visual evidence before planning; raw storage credentials and arbitrary image URLs never enter the language-model context.',
    'Long-running work means Blackstar may checkpoint and resume the same bounded run after interruption; it does not grant extra permissions, tools or external authority.',
    'Async tools mean a granted Astra run may queue an already-authorised active Blackstar workflow for durable background execution; the workflow worker, approvals and step policies remain authoritative.',
    'Multi-agent means a granted Astra run may hand a bounded objective to Blackstar’s existing Orchestrator and Workforce engine. Specialist agents execute only with their own existing tools, approvals, entitlements, memory and verification boundaries; orchestration never transfers the caller’s authority.',
    'Do not claim vision, multimodal understanding, external actions, artifacts, async execution, multi-agent execution or computer use unless they are listed as available for this run and the required tool is actually granted.',
  ].join('\n')
}
