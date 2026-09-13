import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSupabaseAdminFetch,
  resolveSupabaseAdminKey,
  resolveSupabaseAdminKeyCandidates,
  type SupabaseAdminKey,
} from "./client.server";

afterEach(() => {
  vi.restoreAllMocks();
});

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

  it("accepts direct, JSON-string, JSON-array and delimited secret collections", () => {
    for (const raw of [
      "sb_secret_direct_collection_test",
      JSON.stringify("sb_secret_json_string_test"),
      JSON.stringify(["sb_secret_array_test", "sb_publishable_ignored"]),
      "sb_secret_delimited_one_test, sb_secret_delimited_two_test\nsb_publishable_ignored",
    ]) {
      const candidates = resolveSupabaseAdminKeyCandidates({ SUPABASE_SECRET_KEYS: raw });
      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates.every((candidate) => candidate.key.startsWith("sb_secret_"))).toBe(true);
      expect(candidates.every((candidate) => candidate.source === "SUPABASE_SECRET_KEYS")).toBe(true);
    }
  });

  it("uses the first explicit collection candidate only when no legacy fallback exists", () => {
    expect(
      resolveSupabaseAdminKey({
        SUPABASE_SECRET_KEYS: JSON.stringify([
          "sb_secret_primary_test",
          "sb_secret_secondary_test",
        ]),
      }),
    ).toEqual({ key: "sb_secret_primary_test", source: "SUPABASE_SECRET_KEYS" });
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

  it("collects all explicitly configured privileged candidates in deterministic order and deduplicates them", () => {
    expect(
      resolveSupabaseAdminKeyCandidates({
        SUPABASE_SECRET_KEY: "sb_secret_direct_test",
        SUPABASE_SECRET_KEYS: JSON.stringify({
          default: "sb_secret_direct_test",
          automations: "sb_secret_automations_test",
          ignored: "sb_publishable_public_only",
        }),
        SUPABASE_SERVICE_ROLE_KEY: "legacy-service-role-test",
      }),
    ).toEqual([
      { key: "sb_secret_direct_test", source: "SUPABASE_SECRET_KEY" },
      { key: "sb_secret_automations_test", source: "SUPABASE_SECRET_KEYS" },
      { key: "legacy-service-role-test", source: "SUPABASE_SERVICE_ROLE_KEY" },
    ]);
  });
});

describe("Supabase admin key failover fetch", () => {
  const candidates: SupabaseAdminKey[] = [
    { key: "sb_secret_stale_test", source: "SUPABASE_SECRET_KEY" },
    { key: "legacy-service-role-test", source: "SUPABASE_SERVICE_ROLE_KEY" },
  ];

  it("retries once with the next configured privileged key only after Supabase rejects the API key", async () => {
    const seen: Array<{ apikey: string | null; authorization: string | null }> = [];
    let call = 0;
    const fetchImpl = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      seen.push({
        apikey: headers.get("apikey"),
        authorization: headers.get("Authorization"),
      });
      call += 1;
      if (call === 1) {
        return new Response(JSON.stringify({ message: "Invalid API key" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify([{ id: "ok" }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const adminFetch = createSupabaseAdminFetch(candidates, fetchImpl);
    const response = await adminFetch("https://example.supabase.co/rest/v1/workflow_runs", {
      headers: { Authorization: "Bearer sb_secret_stale_test" },
    });

    expect(response.status).toBe(200);
    expect(seen).toEqual([
      { apikey: "sb_secret_stale_test", authorization: null },
      {
        apikey: "legacy-service-role-test",
        authorization: "Bearer legacy-service-role-test",
      },
    ]);
  });

  it("caches the accepted fallback candidate for later requests", async () => {
    const seen: string[] = [];
    const fetchImpl = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      const key = new Headers(init?.headers).get("apikey") ?? "";
      seen.push(key);
      if (key === "sb_secret_stale_test") {
        return new Response(JSON.stringify({ message: "Invalid API key" }), { status: 401 });
      }
      return new Response("[]", { status: 200 });
    }) as typeof fetch;

    const adminFetch = createSupabaseAdminFetch(candidates, fetchImpl);
    await adminFetch("https://example.supabase.co/rest/v1/workflow_runs");
    await adminFetch("https://example.supabase.co/rest/v1/workflow_runs");

    expect(seen).toEqual([
      "sb_secret_stale_test",
      "legacy-service-role-test",
      "legacy-service-role-test",
    ]);
  });

  it("does not replay a request for unrelated 401 responses or server errors", async () => {
    for (const response of [
      new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 }),
      new Response(JSON.stringify({ message: "Database unavailable" }), { status: 500 }),
    ]) {
      let calls = 0;
      const fetchImpl = (async () => {
        calls += 1;
        return response.clone();
      }) as typeof fetch;
      const adminFetch = createSupabaseAdminFetch(candidates, fetchImpl);
      const result = await adminFetch("https://example.supabase.co/rest/v1/workflow_runs", {
        method: "POST",
        body: "{}",
      });
      expect(result.status).toBe(response.status);
      expect(calls).toBe(1);
    }
  });

  it("reports only redacted source metadata after all privileged candidates are rejected", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ message: "Invalid API key" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })) as typeof fetch;

    const adminFetch = createSupabaseAdminFetch(candidates, fetchImpl);
    const response = await adminFetch("https://example.supabase.co/rest/v1/workflow_runs");
    expect(response.status).toBe(401);

    const serialized = JSON.stringify(error.mock.calls);
    expect(serialized).toContain("candidateCount");
    expect(serialized).toContain("SUPABASE_SECRET_KEY");
    expect(serialized).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(serialized).not.toContain("sb_secret_stale_test");
    expect(serialized).not.toContain("legacy-service-role-test");
  });
});
