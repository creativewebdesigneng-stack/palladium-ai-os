import { decryptToken, encryptToken } from '@/lib/integrations/oauth.server'
import type { Provider, ProviderAccess } from './model-gateway.base'

export type UserConnectableModelProvider = Extract<Provider, 'openai' | 'anthropic'>

type CredentialRow = {
  id: string
  user_id: string
  provider: UserConnectableModelProvider
  label: string
  api_key_ciphertext: string
  enabled: boolean
  verified_at: string | null
  last_used_at: string | null
  last_error: string | null
  created_at: string
  updated_at: string
}

function assertConnectableProvider(provider: Provider): asserts provider is UserConnectableModelProvider {
  if (provider !== 'openai' && provider !== 'anthropic') {
    throw new Error('This provider does not support user-owned API credentials.')
  }
}

function hasSupabaseAdminEnvironment() {
  const url = process.env['SUPABASE_URL']
  const secret =
    process.env['SUPABASE_SECRET_KEY'] ||
    process.env['SUPABASE_SECRET_KEYS'] ||
    process.env['SUPABASE_SERVICE_ROLE_KEY']
  return Boolean(url && secret)
}

async function admin() {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  return supabaseAdmin as unknown as { from: (table: string) => any }
}

export async function listUserModelProviderCredentials(userId: string) {
  if (!hasSupabaseAdminEnvironment()) return []
  const sb = await admin()
  const { data, error } = await sb
    .from('model_provider_credentials')
    .select('id,provider,label,enabled,verified_at,last_used_at,last_error,created_at,updated_at')
    .eq('user_id', userId)
    .order('provider', { ascending: true })

  if (error) {
    if (String(error.code ?? '') === '42P01') return []
    throw new Error('Could not load personal model provider connections.')
  }
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row['id']),
    provider: String(row['provider']) as UserConnectableModelProvider,
    label: String(row['label'] ?? ''),
    enabled: row['enabled'] !== false,
    verifiedAt: typeof row['verified_at'] === 'string' ? row['verified_at'] : null,
    lastUsedAt: typeof row['last_used_at'] === 'string' ? row['last_used_at'] : null,
    lastError: typeof row['last_error'] === 'string' ? row['last_error'] : null,
    createdAt: String(row['created_at'] ?? ''),
    updatedAt: String(row['updated_at'] ?? ''),
  }))
}

export async function saveUserModelProviderCredential(args: {
  userId: string
  provider: UserConnectableModelProvider
  apiKey: string
  label?: string | null
  verifiedAt?: string | null
}) {
  const provider = args.provider
  assertConnectableProvider(provider)
  const key = args.apiKey.trim()
  if (!key || key.length > 8192) throw new Error('A valid provider API key is required.')

  const sb = await admin()
  const now = new Date().toISOString()
  const { data, error } = await sb
    .from('model_provider_credentials')
    .upsert({
      user_id: args.userId,
      provider,
      label: (args.label?.trim() || (provider === 'openai' ? 'OpenAI' : 'Anthropic')).slice(0, 120),
      api_key_ciphertext: encryptToken(key),
      enabled: true,
      verified_at: args.verifiedAt ?? now,
      last_error: null,
      updated_at: now,
    }, { onConflict: 'user_id,provider' })
    .select('id,provider,label,enabled,verified_at,last_used_at,last_error,created_at,updated_at')
    .maybeSingle()

  if (error || !data) throw new Error('Could not save the personal model provider connection.')
  return {
    id: String(data.id),
    provider: String(data.provider) as UserConnectableModelProvider,
    label: String(data.label ?? ''),
    enabled: data.enabled !== false,
    verifiedAt: typeof data.verified_at === 'string' ? data.verified_at : null,
    lastUsedAt: typeof data.last_used_at === 'string' ? data.last_used_at : null,
    lastError: typeof data.last_error === 'string' ? data.last_error : null,
    createdAt: String(data.created_at ?? ''),
    updatedAt: String(data.updated_at ?? ''),
  }
}

export async function deleteUserModelProviderCredential(args: {
  userId: string
  provider: UserConnectableModelProvider
}) {
  const sb = await admin()
  const { error } = await sb
    .from('model_provider_credentials')
    .delete()
    .eq('user_id', args.userId)
    .eq('provider', args.provider)
  if (error) throw new Error('Could not disconnect the personal model provider.')
}

export async function resolveUserModelProviderAccess(args: {
  userId: string
  provider: Provider
}): Promise<ProviderAccess | null> {
  if (args.provider !== 'openai' && args.provider !== 'anthropic') return null
  if (!hasSupabaseAdminEnvironment()) return null
  const sb = await admin()
  const { data, error } = await sb
    .from('model_provider_credentials')
    .select('api_key_ciphertext,enabled')
    .eq('user_id', args.userId)
    .eq('provider', args.provider)
    .eq('enabled', true)
    .maybeSingle()

  if (error) {
    if (String(error.code ?? '') === '42P01') return null
    throw new Error('Could not resolve the personal model provider connection.')
  }
  if (!data?.api_key_ciphertext) return null
  return {
    provider: args.provider,
    apiKey: decryptToken(String(data.api_key_ciphertext)),
  }
}

export async function markUserModelProviderUsed(args: {
  userId: string
  provider: Provider
  error?: string | null
}) {
  if (args.provider !== 'openai' && args.provider !== 'anthropic') return
  if (!hasSupabaseAdminEnvironment()) return
  const sb = await admin()
  const now = new Date().toISOString()
  await sb
    .from('model_provider_credentials')
    .update({
      last_used_at: now,
      last_error: args.error?.slice(0, 500) || null,
      updated_at: now,
    })
    .eq('user_id', args.userId)
    .eq('provider', args.provider)
}

export async function isProviderAvailableForUser(args: {
  userId: string
  provider: Provider
}) {
  if (deploymentProviderConfigured(args.provider)) return true
  return Boolean(await resolveUserModelProviderAccess(args))
}

export function deploymentProviderConfigured(provider: Provider): boolean {
  if (provider === 'gemini') return Boolean(process.env['GEMINI_API_KEY'])
  if (provider === 'groq') return Boolean(process.env['GROQ_API_KEY'])
  if (provider === 'deepseek') return Boolean(process.env['DEEPSEEK_API_KEY'])
  if (provider === 'lovable') return Boolean(process.env['LOVABLE_API_KEY'])
  if (provider === 'openai') return Boolean(process.env['OPENAI_API_KEY'])
  if (provider === 'anthropic') return Boolean(process.env['ANTHROPIC_API_KEY'])
  return Boolean(process.env['OPENAI_COMPATIBLE_BASE_URL'])
}
