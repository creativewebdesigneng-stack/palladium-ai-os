import { describe, expect, it } from "vitest";
import { assertFeatureAccess, getFeatureAccess, getVisibleFeatures, isLaunchAdmin } from "./feature-access";
import { resolveFeatureStatus } from "./feature-registry";

describe("Blackstar launch feature access", () => {
  const env = { BLACKSTAR_ADMIN_EMAIL: "owner@example.com" };

  it("defaults unverified features to hidden", () => {
    expect(resolveFeatureStatus("mission_control")).toBe("hidden");
    expect(resolveFeatureStatus("memory")).toBe("hidden");
  });

  it("accepts valid environment overrides and ignores invalid ones", () => {
    expect(resolveFeatureStatus("mission_control", { BLACKSTAR_FEATURE_MISSION_CONTROL: "beta" })).toBe("beta");
    expect(resolveFeatureStatus("mission_control", { BLACKSTAR_FEATURE_MISSION_CONTROL: "enabled" })).toBe("hidden");
  });

  it("matches the admin email case-insensitively and grants all feature access", () => {
    const admin = { email: "OWNER@example.com" };
    expect(isLaunchAdmin(admin, env)).toBe(true);
    expect(getFeatureAccess("mission_control", admin, env).allowed).toBe(true);
  });

  it("limits ordinary visitors to live features", () => {
    const visitor = { email: "visitor@example.com" };
    expect(getFeatureAccess("dashboard", visitor, env).allowed).toBe(true);
    expect(getFeatureAccess("billing", visitor, env).reason).toBe("not_pilot");
    expect(getFeatureAccess("memory", visitor, env).reason).toBe("hidden");
  });

  it("requires both pilot entitlement and per-account beta enablement", () => {
    const pilot = { email: "pilot@example.com", isPilotCustomer: true };
    const betaEnv = { ...env, BLACKSTAR_FEATURE_BILLING: "beta" };
    expect(getFeatureAccess("billing", pilot, betaEnv).reason).toBe("beta_not_enabled");
    expect(getFeatureAccess("billing", { ...pilot, betaFeatures: ["billing"] }, betaEnv).allowed).toBe(true);
  });

  it("returns only features allowed to the actor", () => {
    const visible = getVisibleFeatures({ email: "visitor@example.com" }, env);
    expect(visible).toContain("dashboard");
    expect(visible).not.toContain("mission_control");
    expect(visible).not.toContain("memory");
  });

  it("throws a 403-compatible error for disabled features", () => {
    expect(() => assertFeatureAccess("memory", { email: "visitor@example.com" }, env))
      .toThrow("This feature is not available for your account yet.");
    try {
      assertFeatureAccess("memory", { email: "visitor@example.com" }, env);
    } catch (error) {
      expect(error).toMatchObject({ status: 403, code: "FEATURE_NOT_ENABLED" });
    }
  });
});
