import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(new URL("./workflow-runs.ts", import.meta.url), "utf8");
const webhook = readFileSync(new URL("./webhook-retries.ts", import.meta.url), "utf8");
const dropshipping = readFileSync(
  new URL("./dropshipping-opportunity-monitor.ts", import.meta.url),
  "utf8",
);
const forwardedAuth = readFileSync(
  new URL("../../../lib/runtime/runtime-worker-forwarded-auth.server.ts", import.meta.url),
  "utf8",
);

describe("runtime worker relay backend verification", () => {
  it("re-verifies relay calls through the typed forwarded-auth adapter", () => {
    for (const source of [workflow, webhook, dropshipping]) {
      expect(source).toContain("withVerifiedForwardedRuntimeWorker");
      expect(source).toContain("forwardedAdminKey");
      expect(source).toContain("verified.authorized");
    }
  });

  it("keeps the backend-only verifier RPC behind a request-scoped admin key", () => {
    expect(forwardedAuth).toContain("withRequestScopedSupabaseAdminKey");
    expect(forwardedAuth).toContain('rpc("verify_runtime_worker_token"');
    expect(forwardedAuth).toContain("verified.data !== true");
    expect(forwardedAuth).not.toContain(" as any");
  });

  it("pins each worker identity at the route boundary", () => {
    expect(workflow).toContain('name: "workflow_runner"');
    expect(webhook).toContain('name: "webhook_retry"');
    expect(dropshipping).toContain("name:'dropshipping_monitor'");
  });

  it("keeps direct calls on the existing fallback verifier", () => {
    expect(workflow).toContain('isValidRuntimeWorkerToken("workflow_runner", supplied)');
    expect(webhook).toContain('isValidRuntimeWorkerToken("webhook_retry", supplied)');
    expect(dropshipping).toContain("isValidRuntimeWorkerToken('dropshipping_monitor',supplied)");
  });
});
