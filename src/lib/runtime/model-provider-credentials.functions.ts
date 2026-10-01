import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { writeAudit } from '@/lib/platform/audit.server'
import type { UserConnectableModelProvider } from './model-provider-credentials.server'

const providerSchema = z.enum(['openai', 'anthropic'])
const saveSchema = z.object({
  provider: providerSchema,
  apiKey: z.string().trim().min(20).max(8192),
  label: z.string().trim().max(120).optional(),
})

type ProbeResult = {
  ok: true
  provider: UserConnectableModelProvider
  models: string[]
  checkedAt: string
}

async function probeProviderKey(provider: UserConnectableModelProvider, apiKey: string): Promise<ProbeResult> {
  const checkedAt = new Date().toISOString()
  const signal = AbortSignal.timeout(12_000)
  const response = provider === 'openai'
    ? await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
        signal,
      })
    : await fetch('https://api.anthropic.com/v1/models?limit=20', {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          Accept: 'application/json',
        },
        signal,
      })

  const text = await response.text()
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(`${provider === 'openai' ? 'OpenAI' : 'Anthropic'} rejected that API key.`)
    }
    throw new Error(`${provider === 'openai' ? 'OpenAI' : 'Anthropic'} connection test returned HTTP ${response.status}.`)
  }

  let payload: Record<string, unknown> = {}
  try { payload = JSON.parse(text) as Record<string, unknown> } catch { /* successful empty/unreadable payload remains a valid HTTP probe */ }
  const rows = Array.isArray(payload['data']) ? payload['data'] : []
  const models = rows
    .map((row) => row && typeof row === 'object' ? (row as Record<string, unknown>)['id'] : null)
    .filter((id): id is string => typeof id === 'string')
    .slice(0, 12)

  return { ok: true, provider, models, checkedAt }
}

export const listModelProviderConnections = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listUserModelProviderCredentials } = await import('./model-provider-credentials.server')
    const connections = await listUserModelProviderCredentials(context.userId)
    return {
      providers: [
        {
          id: 'openai' as const,
          name: 'OpenAI',
          deploymentConfigured: Boolean(process.env['OPENAI_API_KEY']),
          connection: connections.find((item: { provider: UserConnectableModelProvider }) => item.provider === 'openai') ?? null,
        },
        {
          id: 'anthropic' as const,
          name: 'Anthropic',
          deploymentConfigured: Boolean(process.env['ANTHROPIC_API_KEY']),
          connection: connections.find((item: { provider: UserConnectableModelProvider }) => item.provider === 'anthropic') ?? null,
        },
      ],
    }
  })

export const saveModelProviderConnection = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => saveSchema.parse(input))
  .handler(async ({ data, context }) => {
    const probe = await probeProviderKey(data.provider, data.apiKey)
    const { saveUserModelProviderCredential } = await import('./model-provider-credentials.server')
    const connection = await saveUserModelProviderCredential({
      userId: context.userId,
      provider: data.provider,
      apiKey: data.apiKey,
      ...(data.label ? { label: data.label } : {}),
      verifiedAt: probe.checkedAt,
    })
    await writeAudit({
      userId: context.userId,
      action: 'model_provider.connected',
      targetType: 'model_provider',
      targetId: data.provider,
      status: 'success',
      metadata: { provider: data.provider, verifiedAt: probe.checkedAt, modelCountObserved: probe.models.length },
    })
    return { connection, models: probe.models }
  })

export const testModelProviderConnection = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ provider: providerSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { resolveUserModelProviderAccess } = await import('./model-provider-credentials.server')
    const access = await resolveUserModelProviderAccess({ userId: context.userId, provider: data.provider })
    if (!access?.apiKey) throw new Error('No personal API key is connected for that provider.')
    const probe = await probeProviderKey(data.provider, access.apiKey)
    return { ok: true, checkedAt: probe.checkedAt, models: probe.models }
  })

export const deleteModelProviderConnection = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ provider: providerSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { deleteUserModelProviderCredential } = await import('./model-provider-credentials.server')
    await deleteUserModelProviderCredential({ userId: context.userId, provider: data.provider })
    await writeAudit({
      userId: context.userId,
      action: 'model_provider.disconnected',
      targetType: 'model_provider',
      targetId: data.provider,
      status: 'success',
      metadata: { provider: data.provider },
    })
    return { disconnected: true, provider: data.provider }
  })
