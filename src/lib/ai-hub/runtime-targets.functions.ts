import { createHash, randomBytes } from 'node:crypto'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { writeAudit } from '@/lib/platform/audit.server'

type Sb = { from: (table: string) => any }

const targetIdSchema = z.string().uuid()
const deploymentTargetSchema = z.enum(['customer-cloud', 'on-prem', 'edge', 'device'])
const regionSchema = z.string().trim().min(1).max(80).optional().nullable()
const metadataSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional()

function issueRuntimeTargetToken() {
  const token = randomBytes(48).toString('hex')
  const tokenSha256 = createHash('sha256').update(token).digest('hex')
  return { token, tokenSha256 }
}

function heartbeatUrl() {
  const base = (
    process.env['SUPABASE_URL'] ||
    process.env['VITE_SUPABASE_URL'] ||
    import.meta.env['VITE_SUPABASE_URL'] ||
    ''
  ).replace(/\/$/, '')
  return base ? `${base}/functions/v1/ai-hub-runtime-target-heartbeat` : '/functions/v1/ai-hub-runtime-target-heartbeat'
}

export const listAiHubRuntimeTargets = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb
    const [targets, organisations] = await Promise.all([
      sb.from('ai_hub_runtime_targets')
        .select('id,user_id,org_id,name,deployment_target,region,health,attested_at,expires_at,last_seen_at,revoked_at,metadata,created_at,updated_at')
        .order('created_at', { ascending: false }),
      sb.from('organisations')
        .select('id,name')
        .order('name', { ascending: true }),
    ])
    if (targets.error) throw new Error(targets.error.message)
    if (organisations.error) throw new Error(organisations.error.message)
    return {
      targets: targets.data ?? [],
      organisations: organisations.data ?? [],
      heartbeatUrl: heartbeatUrl(),
    }
  })

export const registerAiHubRuntimeTarget = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    name: z.string().trim().min(1).max(120),
    deploymentTarget: deploymentTargetSchema,
    region: regionSchema,
    orgId: z.string().uuid().optional().nullable(),
    metadata: metadataSchema,
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb
    const { token, tokenSha256 } = issueRuntimeTargetToken()
    const row = {
      user_id: context.userId,
      org_id: data.orgId ?? null,
      name: data.name,
      deployment_target: data.deploymentTarget,
      region: data.region ?? null,
      token_sha256: tokenSha256,
      metadata: data.metadata ?? {},
    }

    const { data: created, error } = await sb.from('ai_hub_runtime_targets')
      .insert(row)
      .select('id,user_id,org_id,name,deployment_target,region,health,created_at')
      .single()

    if (error) throw new Error(error.message)

    await writeAudit({
      userId: context.userId,
      orgId: data.orgId ?? null,
      action: 'ai_hub_runtime_target_registered',
      targetType: 'ai_hub_runtime_target',
      targetId: created.id,
      metadata: { deploymentTarget: data.deploymentTarget, region: data.region ?? null },
    })

    return {
      target: created,
      token,
      heartbeatUrl: heartbeatUrl(),
      heartbeatEverySeconds: 300,
      expiresAfterSeconds: 600,
    }
  })

export const rotateAiHubRuntimeTargetToken = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ targetId: targetIdSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb
    const { token, tokenSha256 } = issueRuntimeTargetToken()
    const now = new Date().toISOString()

    const { data: updated, error } = await sb.from('ai_hub_runtime_targets')
      .update({ token_sha256: tokenSha256, updated_at: now })
      .eq('id', data.targetId)
      .is('revoked_at', null)
      .select('id,org_id,deployment_target,region')
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!updated) throw new Error('Runtime target not found, revoked, or not manageable by this account.')

    await writeAudit({
      userId: context.userId,
      orgId: updated.org_id ?? null,
      action: 'ai_hub_runtime_target_token_rotated',
      targetType: 'ai_hub_runtime_target',
      targetId: updated.id,
      metadata: { deploymentTarget: updated.deployment_target, region: updated.region ?? null },
    })

    return {
      targetId: updated.id,
      token,
      heartbeatUrl: heartbeatUrl(),
      heartbeatEverySeconds: 300,
      expiresAfterSeconds: 600,
    }
  })

export const revokeAiHubRuntimeTarget = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ targetId: targetIdSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb
    const revokedAt = new Date().toISOString()
    const { data: revoked, error } = await sb.from('ai_hub_runtime_targets')
      .update({ revoked_at: revokedAt, updated_at: revokedAt })
      .eq('id', data.targetId)
      .is('revoked_at', null)
      .select('id,org_id,deployment_target,region')
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!revoked) throw new Error('Runtime target not found or already revoked.')

    await writeAudit({
      userId: context.userId,
      orgId: revoked.org_id ?? null,
      action: 'ai_hub_runtime_target_revoked',
      targetType: 'ai_hub_runtime_target',
      targetId: revoked.id,
      metadata: { deploymentTarget: revoked.deployment_target, region: revoked.region ?? null },
    })

    return { targetId: revoked.id, revokedAt }
  })
