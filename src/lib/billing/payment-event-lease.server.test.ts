import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { claimPaymentEvent, completePaymentEvent, releasePaymentEvent } from "./payment-event-ledger.server";

const signed = { id: "evt_Test123", type: "checkout.session.completed", livemode: false };

function api(outcomes: Array<{ data: unknown; error: unknown }>) {
  const rpc = vi.fn(async (_name: string, _args: Record<string, unknown>) =>
    outcomes.shift() ?? { data: null, error: { message: "no result" } });
  return { db: { from: () => { throw new Error("unexpected direct ledger access"); }, rpc }, rpc };
}

describe("atomic signed payment-event leases", () => {
  it("acquires by signed identity and a unique fenced UUID with a bounded lease", async () => {
    const { db, rpc } = api([{ data: "acquired", error: null }]);
    const claim = await claimPaymentEvent(db, signed, "sandbox");
    expect(claim.status).toBe("acquired");
    if (claim.status !== "acquired") throw new Error("unexpected claim result");
    expect(claim.token).toMatch(/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i);
    expect(rpc).toHaveBeenCalledWith("blackstar_claim_payment_event", {
      p_event_id: "evt_Test123", p_event_type: "checkout.session.completed",
      p_livemode: false, p_lease_token: claim.token, p_lease_seconds: 300,
    });
  });

  it("returns done/busy without a token; a busy webhook must request provider retry", async () => {
    for (const status of ["done", "busy"] as const) {
      const { db } = api([{ data: status, error: null }]);
      await expect(claimPaymentEvent(db, signed, "sandbox")).resolves.toEqual({ status });
    }
    const route = readFileSync(new URL("../../routes/api/public/payments/webhook.ts", import.meta.url), "utf8");
    expect(route).toContain('if (claim.status === "done") return;');
    expect(route).toContain('if (claim.status === "busy") throw');
    expect(route).toContain('return new Response("Webhook processing failed", { status: 503 })');
  });

  it("fails closed for missing/invalid claims and wrong payment environment", async () => {
    const { db } = api([{ data: "unexpected", error: null }]);
    await expect(claimPaymentEvent(db, signed, "sandbox")).rejects.toThrow("invalid state");
    await expect(claimPaymentEvent(db, { ...signed, id: "" }, "sandbox")).rejects.toThrow("identity");
    await expect(claimPaymentEvent(db, signed, "live")).rejects.toThrow("environment");
    const offline = api([{ data: null, error: { message: "database unavailable" } }]);
    await expect(claimPaymentEvent(offline.db, signed, "sandbox")).rejects.toThrow("acquire");
  });

  it("only acknowledges when completion belongs to the current lease", async () => {
    const { db, rpc } = api([{ data: true, error: null }]);
    await expect(completePaymentEvent(db, signed, "sandbox", "lease-1")).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith("blackstar_complete_payment_event", {
      p_event_id: signed.id, p_lease_token: "lease-1",
    });
    const lost = api([{ data: false, error: null }]);
    await expect(completePaymentEvent(lost.db, signed, "sandbox", "stale-token")).rejects.toThrow("owned");
    const failed = api([{ data: null, error: { message: "DB down" } }]);
    await expect(completePaymentEvent(failed.db, signed, "sandbox", "lease-1")).rejects.toThrow("owned");
  });

  it("releases failed work using the exact token, never a caller-provided event id", async () => {
    const { db, rpc } = api([{ data: true, error: null }]);
    await releasePaymentEvent(db, signed, "sandbox", "lease-1");
    expect(rpc).toHaveBeenCalledWith("blackstar_release_payment_event", {
      p_event_id: signed.id, p_lease_token: "lease-1",
    });
    const failed = api([{ data: null, error: { message: "DB down" } }]);
    await expect(releasePaymentEvent(failed.db, signed, "sandbox", "lease-1")).rejects.toThrow("release");
  });

  it("declares service-role-only RPC and uses existing primary-key conflict for claims", () => {
    const sql = readFileSync(new URL("../../../supabase/migrations/20260924202600_blackstar_payment_event_atomic_lease.sql", import.meta.url), "utf8");
    expect(sql).toContain("on conflict (id) do update");
    expect(sql).toContain("and public.marketplace_payment_events.lease_expires_at <= now()");
    expect(sql).toContain("and lease_token=p_lease_token and lease_expires_at > now()");
    expect(sql).toContain("processing_status='processed'");
    expect(sql).toContain("from public, anon, authenticated");
    expect(sql).toContain("to service_role");
    expect(sql).not.toContain("security definer");
  });
});
