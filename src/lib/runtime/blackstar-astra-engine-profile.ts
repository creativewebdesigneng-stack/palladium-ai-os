import type {
  NativeIntelligenceModelDescriptor,
  NativeIntelligenceTaskClass,
} from '@/lib/ai/native-intelligence-model-platform'
import type { Provider } from './model-gateway.base'

/**
 * Blackstar Astra-class Engine v0.1.
 *
 * This is Blackstar's own bounded General Intelligence engine slot. It does not
 * use or claim OpenAI hosted model access. The preferred serving layer is a
 * Blackstar-controlled OpenAI-compatible endpoint (vLLM, SGLang, TGI, Ollama,
 * etc.). When no dedicated endpoint is configured, production may bootstrap
 * through the already-authorised Groq transport using the verified Qwen 3.8
 * open-weight candidate. The dedicated endpoint always takes precedence.
 *
 * The model is deliberately granted no execution authority here. Tools,
 * approvals, identity, delegation, verification and side effects remain owned
 * by Blackstar's existing runtime and Trust Fabric.
 */
export const BLACKSTAR_ASTRA_ENGINE_PROFILE = {
  id: 'blackstar-astra-v0.1',
  name: 'Blackstar Astra-class Engine v0.1',
  ownership: 'blackstar',
  protocol: 'openai-compatible',
  palladiumProvider: 'compatible',
  baseUrlEnv: 'OPENAI_COMPATIBLE_BASE_URL',
  apiKeyEnv: 'OPENAI_COMPATIBLE_API_KEY',
  modelEnv: 'BLACKSTAR_ASTRA_MODEL',
  defaultModel: 'blackstar-astra-v0.1',
  groqBootstrapModel: 'qwen/qwen3.8-27b',
  specialistModelEnvs: {
    reasoning: 'BLACKSTAR_ASTRA_REASONING_MODEL',
    coding: 'BLACKSTAR_ASTRA_CODING_MODEL',
    tool_use: 'BLACKSTAR_ASTRA_AGENTIC_MODEL',
    agentic: 'BLACKSTAR_ASTRA_AGENTIC_MODEL',
  },
  routingAuthority: 'verified-evaluation-only',
  executionAuthority: 'none',
  target: {
    contextWindow: 1_048_576,
    maxOutputTokens: 131_072,
    reasoningEfforts: ['low', 'medium', 'high', 'xhigh', 'max'],
    capabilities: [
      'reasoning',
      'coding',
      'tool_use',
      'computer_use',
      'browsing',
      'research',
      'vision',
      'structured_output',
      'artifact_creation',
      'multi_agent',
      'long_running_work',
      'mid_turn_steering',
      'async_tools',
      'prompt_caching',
      'persisted_reasoning',
      'compaction',
    ],
  },
} as const

export function isBlackstarAstraGroqBootstrapConfigured(): boolean {
  return !process.env[BLACKSTAR_ASTRA_ENGINE_PROFILE.baseUrlEnv]?.trim()
    && Boolean(process.env['GROQ_API_KEY']?.trim())
}

function baseAstraModel() {
  return process.env[BLACKSTAR_ASTRA_ENGINE_PROFILE.modelEnv]?.trim()
    || (isBlackstarAstraGroqBootstrapConfigured()
      ? BLACKSTAR_ASTRA_ENGINE_PROFILE.groqBootstrapModel
      : BLACKSTAR_ASTRA_ENGINE_PROFILE.defaultModel)
}

export function blackstarAstraModelForTaskClass(taskClass: NativeIntelligenceTaskClass): string {
  const env = taskClass === 'reasoning'
    ? BLACKSTAR_ASTRA_ENGINE_PROFILE.specialistModelEnvs.reasoning
    : taskClass === 'coding'
      ? BLACKSTAR_ASTRA_ENGINE_PROFILE.specialistModelEnvs.coding
      : taskClass === 'tool_use' || taskClass === 'agentic'
        ? BLACKSTAR_ASTRA_ENGINE_PROFILE.specialistModelEnvs.agentic
        : null
  return (env ? process.env[env]?.trim() : '') || baseAstraModel()
}

export function blackstarAstraModelDescriptor(
  model = baseAstraModel(),
): NativeIntelligenceModelDescriptor {
  return {
    id: BLACKSTAR_ASTRA_ENGINE_PROFILE.id,
    provider: 'compatible',
    model,
    ownership: 'blackstar',
    lifecycle: 'candidate',
    capabilities: ['text', 'reasoning', 'coding', 'tools', 'structured_output'],
    context_window: BLACKSTAR_ASTRA_ENGINE_PROFILE.target.contextWindow,
    streaming: true,
    latency_class: 'high',
    cost_class: 'high',
  }
}

export function blackstarAstraModelDescriptorForTaskClass(
  taskClass: NativeIntelligenceTaskClass,
): NativeIntelligenceModelDescriptor {
  return blackstarAstraModelDescriptor(blackstarAstraModelForTaskClass(taskClass))
}

function configuredAstraModels(): Set<string> {
  const models = new Set<string>([baseAstraModel()])
  for (const env of new Set(Object.values(BLACKSTAR_ASTRA_ENGINE_PROFILE.specialistModelEnvs))) {
    const value = process.env[env]?.trim()
    if (value) models.add(value)
  }
  return models
}

export function isBlackstarAstraServingIdentity(provider: Provider, model?: string | null): boolean {
  return provider === 'compatible' && configuredAstraModels().has((model ?? '').trim())
}

export function isBlackstarAstraEngineConfigured(): boolean {
  return Boolean(process.env[BLACKSTAR_ASTRA_ENGINE_PROFILE.baseUrlEnv]?.trim())
    || isBlackstarAstraGroqBootstrapConfigured()
}
