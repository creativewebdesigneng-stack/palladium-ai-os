import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = readFileSync(
  new URL("../../routes/api/internal/workflow-runs.ts", import.meta.url),
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
    expect(relay).toContain('"x-blackstar-supabase-secret-key": secretKey');
    expect(relay).toContain('token.length < 32');
    expect(relay).toContain('request.method !== "POST"');
    expect(relay).not.toContain("target_url");
    expect(relay).not.toContain("request.json()");
  });

  it("accepts only the managed modern Supabase secret key collection", () => {
    expect(relay).toContain('Deno.env.get("SUPABASE_SECRET_KEYS")');
    expect(relay).toContain('key.startsWith("sb_secret_")');
    expect(relay).not.toContain("SUPABASE_ANON_KEY");
  });
});
