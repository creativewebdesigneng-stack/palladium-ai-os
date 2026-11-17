import {
  FEATURE_REGISTRY,
  resolveFeatureStatus,
  type FeatureId,
  type FeatureStatus,
} from "./feature-registry";

export type LaunchActor = {
  email?: string | null;
  isPilotCustomer?: boolean;
  /** Beta features explicitly enabled for this user's account by an admin. */
  betaFeatures?: readonly string[];
};

export type FeatureAccess = {
  allowed: boolean;
  status: FeatureStatus;
  reason: "admin" | "live" | "pilot_beta" | "not_pilot" | "beta_not_enabled" | "hidden";
};

export function isLaunchAdmin(
  actor: LaunchActor,
  env: Record<string, string | undefined> = {},
): boolean {
  const configured = env["BLACKSTAR_ADMIN_EMAIL"]?.trim().toLowerCase();
  return Boolean(configured && actor.email?.trim().toLowerCase() === configured);
}

export function getFeatureAccess(
  featureId: FeatureId,
  actor: LaunchActor,
  env: Record<string, string | undefined> = {},
): FeatureAccess {
  const status = resolveFeatureStatus(featureId, env);
  if (isLaunchAdmin(actor, env)) return { allowed: true, status, reason: "admin" };
  if (status === "hidden") return { allowed: false, status, reason: "hidden" };
  if (status === "live") return { allowed: true, status, reason: "live" };
  if (!actor.isPilotCustomer) return { allowed: false, status, reason: "not_pilot" };
  if (!actor.betaFeatures?.includes(featureId)) {
    return { allowed: false, status, reason: "beta_not_enabled" };
  }
  return { allowed: true, status, reason: "pilot_beta" };
}

export function getVisibleFeatures(
  actor: LaunchActor,
  env: Record<string, string | undefined> = {},
): FeatureId[] {
  return (Object.keys(FEATURE_REGISTRY) as FeatureId[]).filter(
    (featureId) => getFeatureAccess(featureId, actor, env).allowed,
  );
}

/** A stable server response shape for API handlers to translate into HTTP 403. */
export function assertFeatureAccess(
  featureId: FeatureId,
  actor: LaunchActor,
  env: Record<string, string | undefined> = {},
): FeatureAccess {
  const access = getFeatureAccess(featureId, actor, env);
  if (!access.allowed) {
    const error = new Error("This feature is not available for your account yet.") as Error & {
      status: number;
      code: string;
    };
    error.status = 403;
    error.code = "FEATURE_NOT_ENABLED";
    throw error;
  }
  return access;
}
