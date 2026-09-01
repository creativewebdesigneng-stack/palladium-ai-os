import type { Entitlements } from '@/lib/platform/entitlements.server'

export type AiHubCommercialSummary = {
  planCode: string
  planName: string
  status: string
  featureCount: number
  limits: {
    agents: number
    tasksPerMonth: number
    seats: number
    storageMb: number
  }
  usage: {
    agents: number
    tasksThisMonth: number
    seats: number
  }
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  platformAdmin: boolean
}

/** Browser-safe commercial governance projected from the authoritative entitlement engine. */
export function toAiHubCommercialSummary(entitlements: Entitlements): AiHubCommercialSummary {
  return {
    planCode: entitlements.planCode,
    planName: entitlements.planName,
    status: entitlements.status,
    featureCount: entitlements.features.length,
    limits: {
      agents: entitlements.limits.agents,
      tasksPerMonth: entitlements.limits.tasks_per_month,
      seats: entitlements.limits.seats,
      storageMb: entitlements.limits.storage_mb,
    },
    usage: {
      agents: entitlements.usage.agents,
      tasksThisMonth: entitlements.usage.tasksThisMonth,
      seats: entitlements.usage.seats,
    },
    currentPeriodEnd: entitlements.currentPeriodEnd,
    cancelAtPeriodEnd: entitlements.cancelAtPeriodEnd,
    platformAdmin: entitlements.isPlatformAdmin === true,
  }
}
