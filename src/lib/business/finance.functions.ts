/**
 * Finance server functions.
 *
 * Only real recorded transactions are returned. Nothing is projected or
 * invented — when there are no rows the totals are zero and the UI shows an
 * empty state rather than illustrative revenue.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Sb = { from: (t: string) => any };

function monthKey(date: string) {
  return date.slice(0, 7);
}

export const listFinance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const [txRes, usageRes] = await Promise.all([
      sb
        .from("finance_transactions")
        .select("*")
        .order("occurred_on", { ascending: false })
        .limit(1000),
      sb
        .from("usage_records")
        .select("metric, quantity, unit, created_at")
        .order("created_at", { ascending: false })
        .limit(1000),
    ]);
    if (txRes.error) throw new Error(txRes.error.message);

    const transactions = (txRes.data ?? []) as any[];
    const income = transactions.filter((t) => t.direction === "income");
    const expense = transactions.filter((t) => t.direction === "expense");
    const sum = (rows: any[]) => rows.reduce((s, r) => s + Number(r.amount ?? 0), 0);

    const byMonth = new Map<string, { month: string; income: number; expense: number }>();
    for (const tx of transactions) {
      const key = monthKey(String(tx.occurred_on));
      const bucket = byMonth.get(key) ?? { month: key, income: 0, expense: 0 };
      if (tx.direction === "income") bucket.income += Number(tx.amount ?? 0);
      else bucket.expense += Number(tx.amount ?? 0);
      byMonth.set(key, bucket);
    }

    const categories = new Map<string, number>();
    for (const tx of expense) {
      const key = tx.category || "Uncategorised";
      categories.set(key, (categories.get(key) ?? 0) + Number(tx.amount ?? 0));
    }

    const aiCostUnits = ((usageRes.data ?? []) as any[]).filter(
      (u) => u.unit === "usd" || u.metric === "model_cost",
    );

    return {
      transactions,
      summary: {
        revenue: sum(income),
        expenses: sum(expense),
        profit: sum(income) - sum(expense),
        outstanding: sum(transactions.filter((t) => t.status === "pending")),
        count: transactions.length,
        currency: transactions[0]?.currency ?? "GBP",
      },
      series: Array.from(byMonth.values())
        .sort((a, b) => a.month.localeCompare(b.month))
        .map((row) => ({ ...row, profit: row.income - row.expense })),
      categories: Array.from(categories.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
      aiSpend: aiCostUnits.reduce((s, u) => s + Number(u.quantity ?? 0), 0),
    };
  });

export const saveTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        direction: z.enum(["income", "expense"]),
        category: z.string().trim().max(80).optional(),
        description: z.string().trim().max(400).optional(),
        amount: z.coerce.number().min(0).max(1_000_000_000),
        currency: z.string().trim().length(3).default("GBP"),
        status: z.enum(["settled", "pending", "failed"]).default("settled"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const row = {
      occurred_on: data.occurred_on,
      direction: data.direction,
      category: data.category || null,
      description: data.description || null,
      amount: data.amount,
      currency: data.currency.toUpperCase(),
      status: data.status,
    };
    if (data.id) {
      const { data: updated, error } = await sb
        .from("finance_transactions")
        .update(row)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return updated;
    }
    const { data: created, error } = await sb
      .from("finance_transactions")
      .insert({ ...row, user_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return created;
  });

export const deleteTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { error } = await sb.from("finance_transactions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
