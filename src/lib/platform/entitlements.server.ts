/**
 * Server-only entitlement engine.
 *
 * The browser is never the source of truth for plans, limits or usage. Every
 * gated action resolves its plan from the `subscriptions` table (written only
 * by trusted server code) and counts real usage rows from the database.
 */

export type PlanCode = "explorer" | "builder" | "business" | "enterprise";

export type PlanLimits = {
  agents: number;
  tasks_per_month: number;
  seats: number;
  storage_mb: number;
};

export type Entitlements = {
  planCode: PlanCode;
  planName: string;
  status: string;
  limits: PlanLimits;
  features: string[];
  usage: { agents: number; tasksThisMonth: number; seats: number };
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

type Sb = { from: (t: string) => any; rpc: (fn: string, args?: Record<string, unknown>) => any };

const FALLBACK_LIMITS: PlanLimits = { agents: 3, tasks_per_month: 200, seats: 1, storage_mb: 200 };

export const UNLIMITED = -1;

export class EntitlementError extends Error {
  readonly code = "PLAN_LIMIT_REACHED";
  constructor(
    message: string,
    readonly meta: { metric: string; limit: number; used: number; planCode: string },
  ) {
    super(message);
  }
}

function monthStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/** Resolves the effective plan + real usage for a user (or their organisation). */
export async function getEntitlements(
  sb: Sb,
  userId: string,
  orgId: string | null = null,
): Promise<Entitlements> {
  const subQuery = sb
    .from("subscriptions")
    .select("plan_code,status,seats,current_period_end,cancel_at_period_end")
    .in("status", ["trialing", "active", "past_due"])
    .order("updated_at", { ascending: false })
    .limit(1);

  const { data: subs } = orgId
    ? await subQuery.eq("org_id", orgId)
    : await subQuery.is("org_id", null).eq("user_id", userId);

  const sub = subs?.[0] ?? null;
  const planCode = (sub?.plan_code ?? "explorer") as PlanCode;

  const [{ data: plan }, agentCount, taskCount, seatCount] = await Promise.all([
    sb.from("plans").select("code,name,limits,features").eq("code", planCode).maybeSingle(),
    orgId
      ? sb
          .from("personal_agents")
          .select("id", { count: "exact", head: true })
          .eq("org_id_fk", orgId)
      : sb
          .from("personal_agents")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
    (orgId
      ? sb.from("agent_tasks").select("id", { count: "exact", head: true }).eq("org_id", orgId)
      : sb.from("agent_tasks").select("id", { count: "exact", head: true }).eq("user_id", userId)
    ).gte("created_at", monthStart()),
    orgId
      ? sb
          .from("organisation_members")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
      : Promise.resolve({ count: 1 }),
  ]);

  const limits = { ...FALLBACK_LIMITS, ...((plan?.limits as Partial<PlanLimits> | null) ?? {}) };

  return {
    planCode,
    planName: (plan?.name as string) ?? "Explorer",
    status: (sub?.status as string) ?? "active",
    limits,
    features: Array.isArray(plan?.features) ? (plan.features as string[]) : [],
    usage: {
      agents: agentCount?.count ?? 0,
      tasksThisMonth: taskCount?.count ?? 0,
      seats: seatCount?.count ?? 1,
    },
    currentPeriodEnd: (sub?.current_period_end as string | null) ?? null,
    cancelAtPeriodEnd: Boolean(sub?.cancel_at_period_end),
  };
}

/** Throws when the caller has exhausted a plan allowance. Server-side only. */
export function assertWithinLimit(ent: Entitlements, metric: keyof PlanLimits) {
  const limit = ent.limits[metric];
  if (limit === UNLIMITED) return;
  const used =
    metric === "agents"
      ? ent.usage.agents
      : metric === "tasks_per_month"
        ? ent.usage.tasksThisMonth
        : metric === "seats"
          ? ent.usage.seats
          : 0;
  if (used >= limit) {
    throw new EntitlementError(
      `Your ${ent.planName} plan allows ${limit} ${String(metric).replace(/_/g, " ")}. Upgrade to continue.`,
      { metric, limit, used, planCode: ent.planCode },
    );
  }
}

/** Records a usage event. Usage is written with elevated privileges so users
 * cannot forge, edit or delete their own consumption records. */
export async function recordUsage(args: {
  userId: string;
  orgId?: string | null;
  metric: string;
  quantity?: number;
  unit?: string;
  agentId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("usage_records").insert({
    user_id: args.userId,
    org_id: args.orgId ?? null,
    metric: args.metric,
    quantity: args.quantity ?? 1,
    unit: args.unit ?? "count",
    agent_id: args.agentId ?? null,
    metadata: args.metadata ?? {},
  } as never);
}
