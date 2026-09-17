import type { FoodDeliveryCapability, FoodDeliveryProviderId } from "./contracts";

export type FoodDeliveryProviderCertification = {
  providerId: FoodDeliveryProviderId;
  officialApiAccessVerified: boolean;
  credentialsVerified: boolean;
  scopesVerified: boolean;
  webhookVerificationVerified: boolean;
  idempotencyVerified: boolean;
  approvalBoundaryVerified: boolean;
  providerEvidenceVerified: boolean;
  environment: "sandbox" | "production";
  certifiedCapabilities: readonly FoodDeliveryCapability[];
};

export type FoodDeliveryCertificationResult = {
  ready: boolean;
  missing: readonly string[];
  executableCapabilities: readonly FoodDeliveryCapability[];
};

/**
 * Production readiness is evidence-based. Listing a provider in Blackstar's
 * registry never makes it executable. External partner/API approval and live
 * credentials must be verified independently for the target environment.
 */
export function evaluateFoodDeliveryProviderCertification(
  certification: FoodDeliveryProviderCertification,
): FoodDeliveryCertificationResult {
  const missing: string[] = [];
  if (!certification.officialApiAccessVerified) missing.push("official_api_access");
  if (!certification.credentialsVerified) missing.push("credentials");
  if (!certification.scopesVerified) missing.push("scopes");
  if (!certification.webhookVerificationVerified) missing.push("webhook_verification");
  if (!certification.idempotencyVerified) missing.push("idempotency");
  if (!certification.approvalBoundaryVerified) missing.push("approval_boundary");
  if (!certification.providerEvidenceVerified) missing.push("provider_evidence");
  if (certification.environment !== "production") missing.push("production_environment");
  if (certification.certifiedCapabilities.length === 0) missing.push("certified_capabilities");

  const ready = missing.length === 0;
  return {
    ready,
    missing,
    executableCapabilities: ready ? [...certification.certifiedCapabilities] : [],
  };
}

export function assertFoodDeliveryProviderCertified(
  certification: FoodDeliveryProviderCertification,
  capability: FoodDeliveryCapability,
): void {
  const result = evaluateFoodDeliveryProviderCertification(certification);
  if (!result.ready) {
    throw new Error(`Food delivery provider is not production certified: ${result.missing.join(", ")}.`);
  }
  if (!result.executableCapabilities.includes(capability)) {
    throw new Error(`Food delivery capability ${capability} is not provider-certified.`);
  }
}
