/**
 * Authoritative spend limits for the Shopping Agent.
 *
 * Every monetary decision is checked here, on the server, against three
 * independent ceilings:
 *   - per-transaction limit  (the biggest single purchase allowed)
 *   - per-agent monthly cap  (that agent's budget_limit / spend_limits row)
 *   - per-user monthly cap   (the account-wide ceiling)
 *
 * Nothing about payment credentials lives here or anywhere else in the system:
 * the platform only ever prepares a checkout, and the human completes payment
 * on the retailer's own site.
 */

type Sb = { from: (t: string) => any };

export type SpendLimits = {
  currency: string;
  perTransaction: number | null;
  userMonthlyCap: number | null;
  agentMonthlyCap: number | null;
  userMonthSpend: number;
  agentMonthSpend: number;
};

export type LimitVerdict =
  { ok: true; limits: SpendLimits } | { ok: false; limits: SpendLimits; reason: string };

/** Purchases that have been authorised by the user count towards the caps. */
const COMMITTED = ["approved", "approved_awaiting_checkout", "checkout_ready", "completed"];

function monthStart(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

const num = (v: unknown): number | null => (v == null || v === "" ? null : Number(v));

export async function resolveSpendLimits(
  sb: Sb,
  userId: string,
  agentId?: string | null,
): Promise<SpendLimits> {
  const [limitRows, agentRow, spend] = await Promise.all([
    sb.from("spend_limits").select("*").eq("user_id", userId),
    agentId
      ? sb
          .from("personal_agents")
          .select("id, budget_limit, currency")
          .eq("id", agentId)
          .eq("user_id", userId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    sb
      .from("purchase_requests")
      .select("total, currency, status, created_at, approval_request_id")
      .eq("user_id", userId)
      .gte("created_at", monthStart()),
  ]);

  const rows: any[] = limitRows.data ?? [];
  const userRow = rows.find((r) => !r.agent_id) ?? null;
  const agentLimitRow = agentId ? (rows.find((r) => r.agent_id === agentId) ?? null) : null;
  const agent = agentRow?.data ?? null;

  const currency = userRow?.currency ?? agent?.currency ?? "GBP";

  // The tightest configured per-transaction ceiling wins.
  const perTxCandidates = [
    num(agentLimitRow?.per_transaction_limit),
    num(userRow?.per_transaction_limit),
  ].filter((v): v is number => v != null);

  const committed = (spend.data ?? []).filter((p: any) => COMMITTED.includes(p.status));
  const userMonthSpend =
    Math.round(committed.reduce((sum: number, p: any) => sum + Number(p.total ?? 0), 0) * 100) /
    100;

  let agentMonthSpend = 0;
  if (agentId) {
    // Purchases are linked to an agent through their approval record.
    const approvals = await sb
      .from("approval_requests")
      .select("id")
      .eq("user_id", userId)
      .eq("agent_id", agentId)
      .gte("created_at", monthStart());
    const ids = new Set(((approvals.data ?? []) as any[]).map((a) => a.id));
    agentMonthSpend =
      Math.round(
        committed
          .filter((p: any) => p.approval_request_id && ids.has(p.approval_request_id))
          .reduce((sum: number, p: any) => sum + Number(p.total ?? 0), 0) * 100,
      ) / 100;
  }

  const agentMonthlyCap = num(agentLimitRow?.monthly_cap) ?? num(agent?.budget_limit);

  return {
    currency,
    perTransaction: perTxCandidates.length ? Math.min(...perTxCandidates) : null,
    userMonthlyCap: num(userRow?.monthly_cap),
    agentMonthlyCap,
    userMonthSpend,
    agentMonthSpend,
  };
}

const money = (currency: string, value: number) => `${currency} ${value.toFixed(2)}`;

/** Pure check so it can be unit-tested without a database. */
export function checkAgainstLimits(total: number, limits: SpendLimits): LimitVerdict {
  const amount = Math.round(total * 100) / 100;

  if (limits.perTransaction != null && amount > limits.perTransaction) {
    return {
      ok: false,
      limits,
      reason: `This purchase of ${money(limits.currency, amount)} exceeds your per-transaction limit of ${money(limits.currency, limits.perTransaction)}.`,
    };
  }
  if (
    limits.agentMonthlyCap != null &&
    limits.agentMonthSpend + amount > limits.agentMonthlyCap + 1e-9
  ) {
    return {
      ok: false,
      limits,
      reason: `This agent has ${money(limits.currency, Math.max(0, limits.agentMonthlyCap - limits.agentMonthSpend))} left of its ${money(limits.currency, limits.agentMonthlyCap)} monthly budget, so ${money(limits.currency, amount)} cannot be authorised.`,
    };
  }
  if (
    limits.userMonthlyCap != null &&
    limits.userMonthSpend + amount > limits.userMonthlyCap + 1e-9
  ) {
    return {
      ok: false,
      limits,
      reason: `Your account has ${money(limits.currency, Math.max(0, limits.userMonthlyCap - limits.userMonthSpend))} left of its ${money(limits.currency, limits.userMonthlyCap)} monthly spend cap.`,
    };
  }
  return { ok: true, limits };
}

export async function assertWithinLimits(
  sb: Sb,
  userId: string,
  agentId: string | null | undefined,
  total: number,
): Promise<SpendLimits> {
  const limits = await resolveSpendLimits(sb, userId, agentId ?? null);
  const verdict = checkAgainstLimits(total, limits);
  if (!verdict.ok) throw new Error(verdict.reason);
  return limits;
}
