import type { NativeIntelligenceModelDescriptor } from '@/lib/ai/native-intelligence-model-platform'

/**
 * Blackstar Astra-class Engine v0.1.
 *
 * This is Blackstar's own bounded General Intelligence engine slot. It does not
 * use or claim OpenAI model weights. The serving layer is Blackstar-controlled
 * and may be backed by one or more open-weight models exposed through an
 * OpenAI-compatible protocol (vLLM, SGLang, TGI, Ollama, etc.).
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

export function blackstarAstraModelDescriptor(
  model = process.env[BLACKSTAR_ASTRA_ENGINE_PROFILE.modelEnv]?.trim()
    || BLACKSTAR_ASTRA_ENGINE_PROFILE.defaultModel,
): NativeIntelligenceModelDescriptor {
  return {
    id: BLACKSTAR_ASTRA_ENGINE_PROFILE.id,
    provider: 'compatible',
    model,
    ownership: 'blackstar',
    lifecycle: 'candidate',
    // These are the capabilities currently consumable through Blackstar's
    // existing model-gateway contract. Computer/browser/artifact capabilities
    // remain runtime tools and therefore never become model authority.
    capabilities: ['text', 'reasoning', 'coding', 'tools', 'structured_output'],
    context_window: BLACKSTAR_ASTRA_ENGINE_PROFILE.target.contextWindow,
    streaming: true,
    latency_class: 'high',
    cost_class: 'high',
  }
}

export function isBlackstarAstraEngineConfigured(): boolean {
  return Boolean(process.env[BLACKSTAR_ASTRA_ENGINE_PROFILE.baseUrlEnv]?.trim())
}
