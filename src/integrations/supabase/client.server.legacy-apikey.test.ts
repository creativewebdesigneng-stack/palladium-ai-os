import { describe, expect, it } from "vitest";
import { createSupabaseAdminFetch, type SupabaseAdminKey } from "./client.server";

describe("Supabase legacy admin JWT compatibility", () => {
  const candidates: SupabaseAdminKey[] = [
    { key: "sb_secret_stale_test", source: "SUPABASE_SECRET_KEY" },
    { key: "legacy-service-role-jwt-test", source: "SUPABASE_SERVICE_ROLE_KEY" },
  ];

  it("uses the current publishable API key with the legacy service-role JWT after an explicit invalid-key rejection", async () => {
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
      return new Response("[]", { status: 200 });
    }) as typeof fetch;

    const adminFetch = createSupabaseAdminFetch(
      candidates,
      fetchImpl,
      "sb_publishable_current_test",
    );
    const response = await adminFetch("https://example.supabase.co/rest/v1/workflow_runs");

    expect(response.status).toBe(200);
    expect(seen).toEqual([
      { apikey: "sb_secret_stale_test", authorization: null },
      {
        apikey: "sb_publishable_current_test",
        authorization: "Bearer legacy-service-role-jwt-test",
      },
    ]);
  });

  it("never promotes the publishable key to Bearer authorization", async () => {
    const seen: Array<{ apikey: string | null; authorization: string | null }> = [];
    const fetchImpl = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      seen.push({
        apikey: headers.get("apikey"),
        authorization: headers.get("Authorization"),
      });
      return new Response("[]", { status: 200 });
    }) as typeof fetch;

    const adminFetch = createSupabaseAdminFetch(
      [{ key: "legacy-service-role-jwt-test", source: "SUPABASE_SERVICE_ROLE_KEY" }],
      fetchImpl,
      "sb_publishable_current_test",
    );
    await adminFetch("https://example.supabase.co/rest/v1/workflow_runs", {
      headers: { Authorization: "Bearer sb_publishable_current_test" },
    });

    expect(seen).toEqual([
      {
        apikey: "sb_publishable_current_test",
        authorization: "Bearer legacy-service-role-jwt-test",
      },
    ]);
  });

  it("preserves the existing legacy-key transport when no current publishable key is configured", async () => {
    const seen: Array<{ apikey: string | null; authorization: string | null }> = [];
    const fetchImpl = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      seen.push({
        apikey: headers.get("apikey"),
        authorization: headers.get("Authorization"),
      });
      return new Response("[]", { status: 200 });
    }) as typeof fetch;

    const adminFetch = createSupabaseAdminFetch(
      [{ key: "legacy-service-role-jwt-test", source: "SUPABASE_SERVICE_ROLE_KEY" }],
      fetchImpl,
    );
    await adminFetch("https://example.supabase.co/rest/v1/workflow_runs");

    expect(seen).toEqual([
      {
        apikey: "legacy-service-role-jwt-test",
        authorization: "Bearer legacy-service-role-jwt-test",
      },
    ]);
  });
});
