import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { recordProcessedPaymentEvent, wasPaymentEventProcessed } from "./payment-event-ledger.server";

const sandboxEvent = { id: "evt_1234", type: "invoice.paid", livemode: false };

function ledger(seed?: { id: string; event_type: string; livemode: boolean }) {
  const rows = new Map<string, { id: string; event_type: string; livemode: boolean }>();
  if (seed) rows.set(seed.id, seed);
  const state = { failRead: false, failInsert: false, inserts: 0 };
  const sb = {
    from: (table: string) => {
      expect(table).toBe("marketplace_payment_events");
      return {
        select: () => ({
          eq: (_key: string, id: string) => ({
            maybeSingle: async () => ({
              data: state.failRead ? null : rows.get(id) ?? null,
              error: state.failRead ? { message: "database unavailable" } : null,
            }),
          }),
        }),
        insert: async (row: { id: string; event_type: string; livemode: boolean }) => {
          state.inserts += 1;
          if (state.failInsert) return { error: { code: "42501" } };
          if (rows.has(row.id)) return { error: { code: "23505" } };
          rows.set(row.id, row);
          return { error: null };
        },
      };
    },
  };
  return { sb, rows, state };
}

describe("signed Stripe event ledger", () => {
  it("records a successfully handled event and skips sequential replay using the existing durable table", async () => {
    const { sb, state, rows } = ledger();
    await expect(wasPaymentEventProcessed(sb, sandboxEvent, "sandbox")).resolves.toBe(false);
    await recordProcessedPaymentEvent(sb, sandboxEvent, "sandbox");
    expect(rows.get(sandboxEvent.id)).toEqual({
      id: "evt_1234", event_type: "invoice.paid", livemode: false,
    });
    await expect(wasPaymentEventProcessed(sb, sandboxEvent, "sandbox")).resolves.toBe(true);
    expect(state.inserts).toBe(1);
  });

  it("fails closed on missing identity, spoofed environment and conflicting event metadata", async () => {
    const { sb } = ledger({ id: "evt_1234", event_type: "charge.refunded", livemode: false });
    await expect(wasPaymentEventProcessed(sb, sandboxEvent, "sandbox")).rejects.toThrow("conflicts");
    await expect(wasPaymentEventProcessed(sb, sandboxEvent, "live")).rejects.toThrow("environment");
    await expect(recordProcessedPaymentEvent(sb, { ...sandboxEvent, id: "" }, "sandbox")).rejects.toThrow("identity");
    await expect(recordProcessedPaymentEvent(sb, { ...sandboxEvent, livemode: null }, "sandbox")).rejects.toThrow("identity");
  });

  it("does not acknowledge database-read or marker-insertion failures as processed", async () => {
    const { sb, state } = ledger();
    state.failRead = true;
    await expect(wasPaymentEventProcessed(sb, sandboxEvent, "sandbox")).rejects.toThrow("inspect");
    state.failRead = false;
    state.failInsert = true;
    await expect(recordProcessedPaymentEvent(sb, sandboxEvent, "sandbox")).rejects.toThrow("persist");
  });

  it("accepts a concurrent duplicate marker only after verifying the same signed event identity", async () => {
    const { sb } = ledger({ id: "evt_1234", event_type: "invoice.paid", livemode: false });
    await expect(recordProcessedPaymentEvent(sb, sandboxEvent, "sandbox")).resolves.toBeUndefined();
    await expect(recordProcessedPaymentEvent(sb, { ...sandboxEvent, type: "charge.refunded" }, "sandbox"))
      .rejects.toThrow("conflicts");
  });

  it("records successful handling after the switch and uses the installed ledger, not the absent billing claim table", () => {
    const route = readFileSync(new URL("../../routes/api/public/payments/webhook.ts", import.meta.url), "utf8");
    const handle = route.slice(route.indexOf("async function handleWebhook("), route.indexOf("export const Route ="));
    expect(handle).toContain("await claimPaymentEvent(db, event, env)");
    expect(handle).toContain('if (claim.status === "busy") throw');
    expect(handle).toContain("await completePaymentEvent(db, event, env, claim.token)");
    expect(handle).toContain("if (!completed) await releasePaymentEvent(db, event, env, claim.token)");
    expect(handle.indexOf("await completePaymentEvent(")).toBeGreaterThan(handle.indexOf("switch (event.type)"));
    expect(handle).not.toContain("await wasPaymentEventProcessed(");
    expect(handle).not.toContain("await recordProcessedPaymentEvent(");
    expect(handle).not.toContain("claimEvent(");
    expect(route).not.toContain("billing_webhook_events");
    expect(route).toContain('if (error) throw new Error("Failed to record the paid invoice usage.")');
    expect(route).toContain('if (refundError) throw new Error("Could not reconcile the marketplace charge refund.")');
    expect(route).toContain('return new Response("Webhook processing failed", { status: 503 })');
  });
});
