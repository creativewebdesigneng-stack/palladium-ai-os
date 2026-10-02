import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { getEntitlements, recordUsage } from '@/lib/platform/entitlements.server'
import { writeAudit } from '@/lib/platform/audit.server'
import { getOutcomePack, OUTCOME_PACKS } from './outcome-packs'

type Sb = {
  from: (table: string) => any
  rpc: (fn: string, args?: Record<string, unknown>) => any
}

export const getOutcomePackOverview = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb
    const entitlements = await getEntitlements(sb, context.userId)
    return {
      packs: OUTCOME_PACKS.map((item) => ({
        ...item,
        locked: item.tier === 'premium' && entitlements.planCode === 'explorer' && !entitlements.isPlatformAdmin,
      })),
      plan: {
        code: entitlements.planCode,
        name: entitlements.planName,
        isPlatformAdmin: Boolean(entitlements.isPlatformAdmin),
      },
    }
  })

export const launchOutcomePack = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    packId: z.string().trim().min(2).max(120),
    context: z.string().trim().max(4000).optional().default(''),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const pack = getOutcomePack(data.packId)
    if (!pack) throw new Error('Outcome Pack not found.')

    const sb = context.supabase as unknown as Sb
    const entitlements = await getEntitlements(sb, context.userId)
    if (pack.tier === 'premium' && entitlements.planCode === 'explorer' && !entitlements.isPlatformAdmin) {
      throw new Error(`${pack.name} is a paid-plan Outcome Pack. Upgrade your Blackstar plan to launch it.`)
    }

    const request = [
      pack.requestTemplate,
      data.context ? `USER CONTEXT\n${data.context}` : '',
      `OUTCOME PACK: ${pack.name}`,
      `VALUE TARGET: ${pack.value}`,
      'Respect Blackstar approvals, tool permissions, budget controls and connected-provider boundaries. If required information or a real execution provider is missing, stop and surface the blocker rather than simulating success.',
    ].filter(Boolean).join('\n\n').slice(0, 12000)

    const created = await sb.from('personal_tasks')
      .insert({
        user_id: context.userId,
        title: pack.name,
        request,
        category: pack.category,
        priority: pack.tier === 'premium' ? 'high' : 'normal',
        involves_money: pack.involvesMoney,
        requires_approval: pack.involvesMoney,
        required_tools: pack.requiredTools,
      })
      .select('id,title,status,category,requires_approval,created_at')
      .single()

    if (created.error || !created.data) {
      throw new Error(created.error?.message ?? 'Could not launch the Outcome Pack.')
    }

    await recordUsage({
      userId: context.userId,
      metric: 'outcome_pack_launch',
      quantity: 1,
      unit: 'launch',
      metadata: { packId: pack.id, tier: pack.tier, taskId: created.data.id },
    })

    await writeAudit({
      userId: context.userId,
      action: 'outcome_pack.launched',
      targetType: 'personal_task',
      targetId: created.data.id,
      status: 'success',
      metadata: {
        packId: pack.id,
        packName: pack.name,
        tier: pack.tier,
        category: pack.category,
        launchRoute: pack.launchRoute,
        requiresApproval: pack.involvesMoney,
      },
    })

    return {
      task: created.data,
      pack: {
        id: pack.id,
        name: pack.name,
        tier: pack.tier,
        launchRoute: pack.launchRoute,
      },
      missionControlRoute: `/mission-control?task=${encodeURIComponent(created.data.id)}`,
    }
  })
