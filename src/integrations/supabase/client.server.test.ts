import { describe, expect, it } from "vitest";
import { resolveSupabaseAdminKey } from "./client.server";

describe("Supabase admin key resolution", () => {
  it("prefers the direct modern secret key over every legacy source", () => {
    expect(
      resolveSupabaseAdminKey({
        SUPABASE_SECRET_KEY: " sb_secret_direct_test ",
        SUPABASE_SECRET_KEYS: JSON.stringify({ default: "sb_secret_collection_test" }),
        SUPABASE_SERVICE_ROLE_KEY: "legacy-service-role-test",
      }),
    ).toEqual({
      key: "sb_secret_direct_test",
      source: "SUPABASE_SECRET_KEY",
    });
  });

  it("uses the default key from the modern secret-key collection", () => {
    expect(
      resolveSupabaseAdminKey({
        SUPABASE_SECRET_KEYS: JSON.stringify({
          default: "sb_secret_default_test",
          billing: "sb_secret_billing_test",
        }),
        SUPABASE_SERVICE_ROLE_KEY: "legacy-service-role-test",
      }),
    ).toEqual({
      key: "sb_secret_default_test",
      source: "SUPABASE_SECRET_KEYS",
    });
  });

  it("accepts one unambiguous named modern secret key when default is absent", () => {
    expect(
      resolveSupabaseAdminKey({
        SUPABASE_SECRET_KEYS: JSON.stringify({ automations: "sb_secret_automations_test" }),
      }),
    ).toEqual({
      key: "sb_secret_automations_test",
      source: "SUPABASE_SECRET_KEYS",
    });
  });

  it("falls back to the legacy service-role key when modern configuration is malformed or ambiguous", () => {
    expect(
      resolveSupabaseAdminKey({
        SUPABASE_SECRET_KEY: "sb_publishable_not_privileged",
        SUPABASE_SECRET_KEYS: JSON.stringify({
          alpha: "sb_secret_alpha_test",
          beta: "sb_secret_beta_test",
        }),
        SUPABASE_SERVICE_ROLE_KEY: "legacy-service-role-test",
      }),
    ).toEqual({
      key: "legacy-service-role-test",
      source: "SUPABASE_SERVICE_ROLE_KEY",
    });

    expect(
      resolveSupabaseAdminKey({
        SUPABASE_SECRET_KEYS: "not-json",
        SUPABASE_SERVICE_ROLE_KEY: "legacy-service-role-test",
      }),
    ).toEqual({
      key: "legacy-service-role-test",
      source: "SUPABASE_SERVICE_ROLE_KEY",
    });
  });

  it("fails closed when no privileged server credential is configured", () => {
    expect(resolveSupabaseAdminKey({})).toBeNull();
    expect(
      resolveSupabaseAdminKey({
        SUPABASE_SECRET_KEY: "sb_publishable_public_only",
        SUPABASE_SECRET_KEYS: JSON.stringify({ default: "sb_publishable_public_only" }),
      }),
    ).toBeNull();
  });
});
