import { FREELLMAPI_PROFILE } from './freellmapi-profile'

export type ModelProviderId = 'lovable' | 'openai' | 'anthropic' | 'deepseek' | 'compatible'

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
    integrations: ['Jan', FREELLMAPI_PROFILE.name],
    routingNote:
      'FreeLLMAPI can own its upstream provider pool, quota-aware routing and fallback while PalladiumAI keeps agent routing and outer provider failover.',
  },
]

export function listModelProviderDefinitions(): readonly ModelProviderDefinition[] {
  return MODEL_PROVIDER_DEFINITIONS
}

export function isModelProviderConfigured(provider: ModelProviderId): boolean {
  if (provider === 'lovable') return Boolean(process.env['LOVABLE_API_KEY'])
  if (provider === 'openai') return Boolean(process.env['OPENAI_API_KEY'])
  if (provider === 'anthropic') return Boolean(process.env['ANTHROPIC_API_KEY'])
  if (provider === 'deepseek') return Boolean(process.env['DEEPSEEK_API_KEY'])
  return Boolean(process.env['OPENAI_COMPATIBLE_BASE_URL'])
}
