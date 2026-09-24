import type { StripeEnv } from "@/lib/stripe.server";

/**
 * Reuse the installed, service-role-only Marketplace payment-event ledger for
 * all signed Stripe billing events. An event is recorded only AFTER its handler
 * succeeds. Recording it before processing loses a paid event when a database
 * write fails and Stripe retries the same event.
 *
 * This is a post-success replay guard, not an atomic claim or a concurrent
 * delivery lock. The broader exactly-once/lease and partial-write reconciliation
 * programme remains open.
 */
type PaymentEvent = { id?: unknown; type?: unknown; livemode?: unknown };
type Sb = { from: (table: string) => any };

function eventIdentity(event: PaymentEvent, env: StripeEnv) {
  if (typeof event.id !== "string" || !/^evt_[a-zA-Z0-9]+$/.test(event.id) ||
      typeof event.type !== "string" || !event.type.trim() ||
      typeof event.livemode !== "boolean" || event.livemode !== (env === "live")) {
    throw new Error("Signed payment event has invalid identity or environment.");
  }
  return { id: event.id, event_type: event.type, livemode: event.livemode };
}

export async function wasPaymentEventProcessed(sb: Sb, event: PaymentEvent, env: StripeEnv): Promise<boolean> {
  const identity = eventIdentity(event, env);
  const { data, error } = await sb.from("marketplace_payment_events")
    .select("id,event_type,livemode").eq("id", identity.id).maybeSingle();
  if (error) throw new Error("Could not inspect the durable payment event ledger.");
  if (!data) return false;
  if (data.event_type !== identity.event_type || data.livemode !== identity.livemode) {
    throw new Error("Payment event identity conflicts with its durable ledger.");
  }
  return true;
}

export async function recordProcessedPaymentEvent(sb: Sb, event: PaymentEvent, env: StripeEnv): Promise<void> {
  const identity = eventIdentity(event, env);
  const { error } = await sb.from("marketplace_payment_events").insert(identity);
  if (!error) return;
  // A concurrent attempt may have successfully completed the same handler
  // before inserting its marker. Verify the exact identity, not just an event
  // id collision, before returning success.
  if (error.code === "23505" && await wasPaymentEventProcessed(sb, event, env)) return;
  throw new Error("Could not persist completed payment event for replay protection.");
}
