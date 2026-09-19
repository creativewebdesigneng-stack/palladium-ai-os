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
    expect(relay).toContain('"https://palladium-ai-os.vercel.app/api/internal/workflow-runs"');
    expect(relay).toContain('"https://palladium-ai-os.vercel.app/api/internal/webhook-retries"');
    expect(relay).toContain('"https://palladium-ai-os.vercel.app/api/internal/dropshipping-opportunity-monitor"');
    expect(relay).toContain('"x-blackstar-supabase-secret-key": secretKey');
    expect(relay).toContain('validWorkerToken(worker.name, token)');
    expect(relay).toContain('rest/v1/rpc/verify_runtime_worker_token');
    expect(relay).toContain('worker_name: worker');
    expect(relay).toContain('request.method !== "POST"');
    expect(relay).not.toContain("target_url");
    expect(relay).not.toContain("request.json()");
  });

  it("verifies worker tokens with the managed publishable verifier before loading the backend secret", () => {
    expect(relay).toContain('"SUPABASE_PUBLISHABLE_KEYS", "sb_publishable_"');
    expect(relay).toContain("apikey: publishableKey");
    expect(relay).toContain('"SUPABASE_SECRET_KEYS", "sb_secret_"');
    expect(relay.indexOf("validWorkerToken(worker.name, token)"))
      .toBeLessThan(relay.indexOf('"SUPABASE_SECRET_KEYS", "sb_secret_"'));
    expect(relay).not.toContain("SUPABASE_ANON_KEY");
  });

  it("keeps request-scoped credentials behind each route's existing worker token", () => {
    for (const [source, tokenName] of [
      [route, "workflow_runner"],
      [webhookRoute, "webhook_retry"],
      [dropshippingRoute, "dropshipping_monitor"],
    ] as const) {
      const doubleQuoted = `isValidRuntimeWorkerToken("${tokenName}"`;
      const singleQuoted = `isValidRuntimeWorkerToken('${tokenName}'`;
      const authIndex = Math.max(source.indexOf(doubleQuoted), source.indexOf(singleQuoted));
      expect(authIndex).toBeGreaterThanOrEqual(0);
      expect(source).toContain("x-blackstar-supabase-secret-key");
      expect(authIndex).toBeLessThan(source.indexOf("x-blackstar-supabase-secret-key"));
    }
  });
});
