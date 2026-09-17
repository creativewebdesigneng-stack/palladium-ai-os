import type {
  FoodDeliveryCapability,
  FoodDeliveryConnectionStatus,
  FoodDeliveryEnvironment,
  FoodDeliveryProviderId,
} from "./contracts";

export type FoodDeliveryConnectionRecord = {
  id: string;
  userId: string;
  providerId: FoodDeliveryProviderId;
  environment: FoodDeliveryEnvironment;
  status: FoodDeliveryConnectionStatus;
  credentialRef?: string;
  merchantLocationId?: string;
  grantedCapabilities: readonly FoodDeliveryCapability[];
  capabilitySnapshot: Readonly<Record<string, unknown>>;
};

export type FoodDeliveryOperationStatus =
  | "pending_approval"
  | "approved"
  | "executing"
  | "succeeded"
  | "failed"
  | "cancelled";

export type FoodDeliveryOperationRecord = {
  id: string;
  userId: string;
  connectionId: string;
  requestId: string;
  capability: FoodDeliveryCapability;
  status: FoodDeliveryOperationStatus;
  approvalRequestId?: string;
  providerResourceId?: string;
  inputFingerprint: string;
  resultMetadata: Readonly<Record<string, unknown>>;
  lastError?: string;
};

export interface FoodDeliveryPersistence {
  getConnectionForUser(userId: string, connectionId: string): Promise<FoodDeliveryConnectionRecord | null>;
  findOperation(userId: string, requestId: string): Promise<FoodDeliveryOperationRecord | null>;
  createOperation(input: Omit<FoodDeliveryOperationRecord, "id">): Promise<FoodDeliveryOperationRecord>;
  updateOperation(
    userId: string,
    operationId: string,
    patch: Partial<Pick<
      FoodDeliveryOperationRecord,
      "status" | "approvalRequestId" | "providerResourceId" | "resultMetadata" | "lastError"
    >>,
  ): Promise<FoodDeliveryOperationRecord>;
}

/**
 * Secrets must remain in Blackstar's existing provider/integration secret layer.
 * This module only persists an opaque reference to those credentials.
 */
export function assertOpaqueCredentialReference(credentialRef: string): void {
  if (!credentialRef || /^(sk-|bearer |basic |eyj)/i.test(credentialRef.trim())) {
    throw new Error("Food delivery credentials must be stored as an opaque credential reference");
  }
}
