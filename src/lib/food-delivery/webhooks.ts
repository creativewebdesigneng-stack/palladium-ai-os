import type { FoodDeliveryProviderId } from './contracts';

export type FoodDeliveryWebhookEvent = {
  provider: FoodDeliveryProviderId;
  eventId: string;
  eventType: string;
  resourceId?: string;
  merchantId?: string;
  occurredAt?: string;
  environment?: 'sandbox' | 'production';
  payload: unknown;
};

export type WebhookVerificationInput = {
  provider: FoodDeliveryProviderId;
  rawBody: string;
  headers: Record<string, string | undefined>;
  secret: string;
};

export type WebhookVerificationResult =
  | { verified: true; dedupeKey: string }
  | { verified: false; reason: string };

/**
 * Provider adapters must verify signatures before normalization or persistence.
 * The core deliberately does not know provider secrets and never logs raw bodies.
 */
export interface FoodDeliveryWebhookAdapter {
  provider: FoodDeliveryProviderId;
  verify(input: WebhookVerificationInput): Promise<WebhookVerificationResult>;
  normalize(rawBody: string, headers: Record<string, string | undefined>): FoodDeliveryWebhookEvent;
}

export function webhookDedupeKey(provider: FoodDeliveryProviderId, eventId: string): string {
  return `food-delivery:${provider}:${eventId}`;
}
