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

/**
 * Per-event database claim. The existing payment-event PK is the serialization
 * point for simultaneous Stripe retries, including across Vercel instances.
 * A busy delivery MUST return a retryable response instead of 2xx.
 */
export type PaymentEventClaim =
  | { status: "acquired"; token: string }
  | { status: "done" }
  | { status: "busy" };

export async function claimPaymentEvent(
  sb: Sb, event: PaymentEvent, env: StripeEnv,
): Promise<PaymentEventClaim> {
  const identity = eventIdentity(event, env);
  const token = crypto.randomUUID();
  const { data, error } = await (sb as Sb & { rpc: (name: string, args: Record<string, unknown>) => Promise<any> })
    .rpc("blackstar_claim_payment_event", {
      p_event_id: identity.id,
      p_event_type: identity.event_type,
      p_livemode: identity.livemode,
      p_lease_token: token,
      p_lease_seconds: 300,
    });
  if (error) throw new Error("Could not acquire a payment event processing lease.");
  if (data === "acquired") return { status: "acquired", token };
  if (data === "done") return { status: "done" };
  if (data === "busy") return { status: "busy" };
  throw new Error("Payment event claim returned an invalid state.");
}

export async function completePaymentEvent(
  sb: Sb, event: PaymentEvent, env: StripeEnv, token: string,
): Promise<void> {
  const { id } = eventIdentity(event, env);
  const { data, error } = await (sb as Sb & { rpc: (name: string, args: Record<string, unknown>) => Promise<any> })
    .rpc("blackstar_complete_payment_event", { p_event_id: id, p_lease_token: token });
  if (error || data !== true) {
    throw new Error("Could not complete the owned payment event lease.");
  }
}

export async function releasePaymentEvent(
  sb: Sb, event: PaymentEvent, env: StripeEnv, token: string,
): Promise<void> {
  const { id } = eventIdentity(event, env);
  const { error } = await (sb as Sb & { rpc: (name: string, args: Record<string, unknown>) => Promise<any> })
    .rpc("blackstar_release_payment_event", { p_event_id: id, p_lease_token: token });
  if (error) throw new Error("Could not release the failed payment event lease.");
}
