import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("paid Stripe invoice usage replay safety", () => {
  const migration = readFileSync(new URL("../../../supabase/migrations/20260924212000_paid_invoice_usage_idempotency.sql", import.meta.url), "utf8");
  const webhook = readFileSync(new URL("../../routes/api/public/payments/webhook.ts", import.meta.url), "utf8");
  const usage = webhook.slice(webhook.indexOf("async function recordUsage("), webhook.indexOf("async function markPaymentFailed("));

  it("uniquely keys authoritative Stripe invoice id and environment only for paid-invoice usage", () => {
    expect(migration).toContain("create unique index if not exists usage_records_paid_invoice_provider_once_idx");
    expect(migration).toContain("(metadata->>'invoice_id'), (metadata->>'environment')");
    expect(migration).toContain("where metric='billing.invoice_paid'");
    expect(migration).not.toMatch(/grant\s+(?:all|insert|update)\s+on/i);
    expect(migration).not.toMatch(/drop\s+table/i);
  });

  it("retains the signed invoice and owner read-before-write and reconciles a unique collision only for that owner", () => {
    expect(usage).toContain('typeof invoice.id !== "string" || !invoice.id.startsWith("in_")');
    expect(usage).toContain('.eq("user_id", sub.user_id)');
    expect(usage).toContain('metadata: { invoice_id: invoice.id, environment: env }');
    expect(usage).toContain('if (error.code === "23505")');
    const collision = usage.slice(usage.indexOf('if (error.code === "23505")'));
    expect(collision).toContain('.eq("user_id", sub.user_id)');
    expect(collision).toContain('.contains("metadata", { invoice_id: invoice.id, environment: env })');
    expect(collision).toContain('if (!concurrentReadError && concurrent) return;');
    expect(collision).toContain('throw new Error("Failed to record the paid invoice usage.")');
  });
});
