import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(new URL("./workflow-runs.ts", import.meta.url), "utf8");
const webhook = readFileSync(new URL("./webhook-retries.ts", import.meta.url), "utf8");
const dropshipping = readFileSync(
  new URL("./dropshipping-opportunity-monitor.ts", import.meta.url),
  "utf8",
);

describe("runtime worker relay backend verification", () => {
  it("re-verifies workflow relay tokens with the request-scoped admin client", () => {
    expect(workflow).toContain('supabaseAdmin.rpc("verify_runtime_worker_token"');
    expect(workflow).toContain('worker_name: "workflow_runner"');
    expect(workflow).toContain("verified.data !== true");
    expect(workflow).toContain("withRequestScopedSupabaseAdminKey");
  });

  it("re-verifies webhook relay tokens with the request-scoped admin client", () => {
    expect(webhook).toContain('supabaseAdmin.rpc("verify_runtime_worker_token"');
    expect(webhook).toContain('worker_name: "webhook_retry"');
    expect(webhook).toContain("verified.data !== true");
    expect(webhook).toContain("withRequestScopedSupabaseAdminKey");
  });

  it("re-verifies dropshipping relay tokens with the request-scoped admin client", () => {
    expect(dropshipping).toContain("supabaseAdmin.rpc('verify_runtime_worker_token'");
    expect(dropshipping).toContain("worker_name:'dropshipping_monitor'");
    expect(dropshipping).toContain("verified.data!==true");
    expect(dropshipping).toContain("withRequestScopedSupabaseAdminKey");
  });

  it("keeps direct calls on the existing fallback verifier", () => {
    expect(workflow).toContain('isValidRuntimeWorkerToken("workflow_runner", supplied)');
    expect(webhook).toContain('isValidRuntimeWorkerToken("webhook_retry", supplied)');
    expect(dropshipping).toContain("isValidRuntimeWorkerToken('dropshipping_monitor',supplied)");
  });
});
