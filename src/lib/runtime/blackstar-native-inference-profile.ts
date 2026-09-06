import type { NativeIntelligenceModelDescriptor } from '@/lib/ai/native-intelligence-model-platform'

/**
 * Blackstar Native Model v0.1 intentionally reuses the existing OpenAI-compatible
 * transport. The serving layer may be vLLM, SGLang, TGI, Ollama, or another
 * compatible server hosting Blackstar-controlled weights. No proprietary model
 * weights are claimed by this profile; it is the production inference slot those
 * weights can occupy once trained and qualified.
 */
export const BLACKSTAR_NATIVE_INFERENCE_PROFILE = {
  id: 'blackstar-native-v0.1',
  name: 'Blackstar Native Model v0.1',
  ownership: 'blackstar',
  protocol: 'openai-compatible',
  palladiumProvider: 'compatible',
  baseUrlEnv: 'OPENAI_COMPATIBLE_BASE_URL',
  apiKeyEnv: 'OPENAI_COMPATIBLE_API_KEY',
  modelEnv: 'BLACKSTAR_NATIVE_MODEL',
  defaultModel: 'blackstar-native-v0.1',
  chatPath: '/chat/completions',
  routingAuthority: 'evaluation-only',
  executionAuthority: 'none',
} as const

export function blackstarNativeModelDescriptor(
  model = process.env['BLACKSTAR_NATIVE_MODEL']?.trim() || BLACKSTAR_NATIVE_INFERENCE_PROFILE.defaultModel,
): NativeIntelligenceModelDescriptor {
  return {
    id: BLACKSTAR_NATIVE_INFERENCE_PROFILE.id,
    provider: 'compatible',
    model,
    ownership: 'blackstar',
    lifecycle: 'candidate',
    capabilities: ['text', 'reasoning', 'coding', 'tools', 'structured_output'],
    context_window: 131_072,
    streaming: true,
    latency_class: 'standard',
    cost_class: 'standard',
  }
}

export function isBlackstarNativeInferenceConfigured(): boolean {
  return Boolean(process.env[BLACKSTAR_NATIVE_INFERENCE_PROFILE.baseUrlEnv]?.trim())
}
