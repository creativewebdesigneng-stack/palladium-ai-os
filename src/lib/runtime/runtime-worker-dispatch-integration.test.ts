import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = readFileSync(
  new URL("../../routes/api/internal/workflow-runs.ts", import.meta.url),
  "utf8",
);
const webhookRoute = readFileSync(
  new URL("../../routes/api/internal/webhook-retries.ts", import.meta.url),
  "utf8",
);
const dropshippingRoute = readFileSync(
  new URL("../../routes/api/internal/dropshipping-opportunity-monitor.ts", import.meta.url),
  "utf8",
);
const client = readFileSync(
  new URL("../../integrations/supabase/client.server.ts", import.meta.url),
  "utf8",
);
const relay = readFileSync(
  new URL("../../../supabase/functions/runtime-worker-dispatch/index.ts", import.meta.url),
  "utf8",
);

describe("runtime worker Supabase dispatch relay", () => {
  it("keeps the existing worker bearer token as the authority boundary", () => {
    expect(route).toContain('isValidRuntimeWorkerToken("workflow_runner", supplied)');
    expect(route.indexOf('isValidRuntimeWorkerToken("workflow_runner", supplied)'))
      .toBeLessThan(route.indexOf('x-blackstar-supabase-secret-key'));
  });

  it("uses a request-scoped server credential without mutating process env", () => {
    expect(client).toContain("AsyncLocalStorage");
    expect(client).toContain("withRequestScopedSupabaseAdminKey");
    expect(client).toContain("requestScopedSupabaseAdmin.run");
    expect(client).not.toMatch(/process\.env\["SUPABASE_SECRET_KEY"\]\s*=/);
  });

  it("does not implement a generic privileged proxy", () => {
    expect(relay).toContain('const UPSTREAM = "https://palladium-ai-os.vercel.app/api/internal/workflow-runs"');
    expect(relay).toContain('"https://palladium-ai-os.vercel.app/api/internal/webhook-retries"');
    expect(relay).toContain('"https://palladium-ai-os.vercel.app/api/internal/dropshipping-opportunity-monitor"');
    expect(relay).toContain('"x-blackstar-supabase-secret-key": secretKey');
    expect(relay).toContain('request.headers.get("x-blackstar-worker-token")');
    expect(relay).toContain('validWorkerToken(worker.name, token)');
    expect(relay).toContain('verify_runtime_worker_token');
    expect(relay).toContain('request.method !== "POST"');
    expect(relay).not.toContain("target_url");
    expect(relay).not.toContain("request.json()");
  });

  it("uses backend-only credentials for verification and dispatch", () => {
    expect(relay).toContain('Deno.env.get("SUPABASE_DB_URL")');
    expect(relay).toContain("verify_runtime_worker_token");
    expect(relay).toContain("postgres(databaseUrl, { prepare: false, max: 1 })");
    expect(relay).toContain('Deno.env.get("SUPABASE_SECRET_KEYS")');
    expect(relay).toContain('key.startsWith("sb_secret_")');
    expect(relay).toContain('"x-blackstar-supabase-secret-key": secretKey');
    expect(relay).not.toContain("SUPABASE_PUBLISHABLE_KEYS");
    expect(relay).not.toContain("SUPABASE_ANON_KEY");
    expect(relay).toContain('Authorization: `Bearer ${token}`');
  });

  it("keeps request-scoped credentials behind each route's existing worker token", () => {
    for (const [source, tokenName] of [
      [route, "workflow_runner"],
      [webhookRoute, "webhook_retry"],
      [dropshippingRoute, "dropshipping_monitor"],
    ] as const) {
      expect(source).toContain(`isValidRuntimeWorkerToken("${tokenName}"`)
      expect(source).toContain("x-blackstar-supabase-secret-key")
      expect(source.indexOf(`isValidRuntimeWorkerToken("${tokenName}"`))
        .toBeLessThan(source.indexOf("x-blackstar-supabase-secret-key"))
    }
  });
});
