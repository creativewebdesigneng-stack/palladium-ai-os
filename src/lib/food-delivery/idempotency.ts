import type { FoodDeliveryProviderId } from './contracts';

export type FoodDeliveryExecutionIdentity = {
  userId: string;
  connectionId: string;
  provider: FoodDeliveryProviderId;
  action: string;
  requestId: string;
};

export function foodDeliveryExecutionKey(identity: FoodDeliveryExecutionIdentity): string {
  return [
    'food-delivery',
    identity.userId,
    identity.connectionId,
    identity.provider,
    identity.action,
    identity.requestId,
  ].join(':');
}

/**
 * Side-effecting provider adapters must claim this key through Blackstar's
 * existing exactly-once execution infrastructure before calling a provider.
 * This module intentionally does not introduce another persistence system.
 */
export type FoodDeliveryExecutionClaim = {
  key: string;
  claimed: boolean;
  previousResult?: unknown;
};
