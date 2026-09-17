import type {
  FoodDeliveryWebhookAdapter,
  FoodDeliveryWebhookEvent,
  WebhookVerificationInput,
} from "./webhooks";

export type FoodDeliveryWebhookReceiptStore = {
  claim(dedupeKey: string, event: FoodDeliveryWebhookEvent): Promise<boolean>;
  markProcessed(dedupeKey: string): Promise<void>;
  markFailed(dedupeKey: string, reason: string): Promise<void>;
};

export type FoodDeliveryWebhookReconciler = (
  event: FoodDeliveryWebhookEvent,
) => Promise<void>;

export type FoodDeliveryWebhookOutcome =
  | { status: "processed"; dedupeKey: string; event: FoodDeliveryWebhookEvent }
  | { status: "duplicate"; dedupeKey: string }
  | { status: "rejected"; reason: string };

/**
 * Signature verification happens before normalization or persistence. A receipt
 * is atomically claimed before reconciliation so provider retries cannot apply
 * the same state transition twice. Raw webhook bodies are never stored here.
 */
export async function reconcileFoodDeliveryWebhook(input: {
  adapter: FoodDeliveryWebhookAdapter;
  verification: WebhookVerificationInput;
  receipts: FoodDeliveryWebhookReceiptStore;
  reconcile: FoodDeliveryWebhookReconciler;
}): Promise<FoodDeliveryWebhookOutcome> {
  if (input.adapter.provider !== input.verification.provider) {
    return { status: "rejected", reason: "Webhook provider mismatch." };
  }

  const verification = await input.adapter.verify(input.verification);
  if (!verification.verified) {
    return { status: "rejected", reason: verification.reason };
  }

  const event = input.adapter.normalize(
    input.verification.rawBody,
    input.verification.headers,
  );
  if (event.provider !== input.adapter.provider) {
    return { status: "rejected", reason: "Normalized webhook provider mismatch." };
  }

  const claimed = await input.receipts.claim(verification.dedupeKey, event);
  if (!claimed) {
    return { status: "duplicate", dedupeKey: verification.dedupeKey };
  }

  try {
    await input.reconcile(event);
    await input.receipts.markProcessed(verification.dedupeKey);
    return { status: "processed", dedupeKey: verification.dedupeKey, event };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Webhook reconciliation failed.";
    await input.receipts.markFailed(verification.dedupeKey, reason);
    throw error;
  }
}
