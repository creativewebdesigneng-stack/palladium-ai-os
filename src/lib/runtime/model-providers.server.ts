import { FREELLMAPI_PROFILE } from './freellmapi-profile'

export type ModelProviderId = 'lovable' | 'openai' | 'anthropic' | 'deepseek' | 'compatible' | 'freellm'

export type ModelProviderDefinition = {
  id: ModelProviderId
  name: string
  defaultModel: string
  integrations?: string[]
  routingNote?: string
}

const MODEL_PROVIDER_DEFINITIONS: readonly ModelProviderDefinition[] = [
  { id: 'lovable', name: 'Lovable AI Gateway', defaultModel: 'google/gemini-3-flash-preview' },
  { id: 'openai', name: 'OpenAI', defaultModel: 'gpt-5-mini' },
  { id: 'deepseek', name: 'DeepSeek V3', defaultModel: 'deepseek-chat' },
  { id: 'anthropic', name: 'Anthropic', defaultModel: 'claude-sonnet-4-5-20250929' },
  {
    id: 'compatible',
    name: 'Local / OpenAI-compatible',
    defaultModel: 'local-model',
    integrations: ['Jan'],
    routingNote:
      'Blackstar native/self-hosted inference uses this lane. When native-primary is enabled, the configured BLACKSTAR_NATIVE_MODEL is surfaced as the default.',
  },
  {
    id: 'freellm',
    name: FREELLMAPI_PROFILE.name,
    defaultModel: 'freellm-default',
    integrations: [FREELLMAPI_PROFILE.name],
    routingNote:
      'Independent OpenAI-compatible evaluator lane. It uses FREELLMAPI_* server-only configuration and never reuses the Blackstar native compatible endpoint or credentials.',
  },
]

function compatibleDefaultModel(): string {
  const nativePrimary = process.env['BLACKSTAR_NATIVE_PRIMARY']?.trim().toLowerCase()
  const enabled = nativePrimary === '1' || nativePrimary === 'true' || nativePrimary === 'yes' || nativePrimary === 'on'
  const nativeModel = process.env['BLACKSTAR_NATIVE_MODEL']?.trim()
  if (enabled && nativeModel && process.env['OPENAI_COMPATIBLE_BASE_URL']?.trim()) return nativeModel
  return 'local-model'
}

function freeLlmDefaultModel(): string {
  return process.env['FREELLMAPI_MODEL']?.trim() || 'freellm-default'
}

export function listModelProviderDefinitions(): readonly ModelProviderDefinition[] {
  const compatibleModel = compatibleDefaultModel()
  const freeLlmModel = freeLlmDefaultModel()
  return MODEL_PROVIDER_DEFINITIONS.map((provider) => {
    if (provider.id === 'compatible') return { ...provider, defaultModel: compatibleModel }
    if (provider.id === 'freellm') return { ...provider, defaultModel: freeLlmModel }
    return provider
  })
}

export function isModelProviderConfigured(provider: ModelProviderId): boolean {
  if (provider === 'lovable') return Boolean(process.env['LOVABLE_API_KEY'])
  if (provider === 'openai') return Boolean(process.env['OPENAI_API_KEY'])
  if (provider === 'anthropic') return Boolean(process.env['ANTHROPIC_API_KEY'])
  if (provider === 'deepseek') return Boolean(process.env['DEEPSEEK_API_KEY'])
  if (provider === 'freellm') return Boolean(process.env['FREELLMAPI_BASE_URL']?.trim() && process.env['FREELLMAPI_MODEL']?.trim())
  return Boolean(process.env['OPENAI_COMPATIBLE_BASE_URL'])
}
