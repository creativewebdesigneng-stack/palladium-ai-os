import { describe, expect, it } from "vitest";
import {
  HARNESS_CAPABILITIES,
  evaluateHarnessPolicy,
  evaluateSubagentSpawn,
  normalizeHarnessDomains,
} from "../agent-harness";

describe("agent harness", () => {
  it("publishes a stable unique capability catalogue", () => {
    const ids = HARNESS_CAPABILITIES.map((capability) => capability.id);
    expect(ids.length).toBeGreaterThanOrEqual(10);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("model_gateway");
    expect(ids).toContain("subagents");
    expect(ids).toContain("sandbox_profiles");
  });

  it("allows ordinary read-only work", () => {
    expect(evaluateHarnessPolicy({ tool: "memory_search", input: { query: "quarterly plan" } }).decision).toBe("allow");
  });

  it("requires approval for writes and external side effects", () => {
    expect(evaluateHarnessPolicy({ tool: "github_write", mutating: true }).decision).toBe("approval");
    expect(evaluateHarnessPolicy({ tool: "email_send", externalEffect: true }).decision).toBe("approval");
    expect(evaluateHarnessPolicy({ tool: "shell", sandboxProfile: "workspace_write" }).decision).toBe("approval");
  });

  it("blocks credentials supplied in model-controlled tool input", () => {
    const result = evaluateHarnessPolicy({
      tool: "integration_action",
      input: { provider: "shopify", input: { api_key: "should-never-be-here" } },
    });
    expect(result.decision).toBe("deny");
    expect(result.code).toBe("credential_input_blocked");
  });

  it("blocks privileged sandbox execution", () => {
    const result = evaluateHarnessPolicy({ tool: "shell", sandboxProfile: "privileged" });
    expect(result.decision).toBe("deny");
    expect(result.code).toBe("privileged_sandbox_blocked");
  });

  it("normalizes and enforces domain boundaries", () => {
    expect(normalizeHarnessDomains(["https://WWW.Example.com/path", "example.com"])).toEqual(["example.com"]);
    expect(evaluateHarnessPolicy({ tool: "web_fetch", requestedDomains: ["docs.example.com"], allowedDomains: ["example.com"] }).decision).toBe("allow");
    expect(evaluateHarnessPolicy({ tool: "web_fetch", requestedDomains: ["evil.test"], allowedDomains: ["example.com"] }).code).toBe("domain_outside_allowlist");
  });

  it("prevents sub-agents escalating tools or nesting indefinitely", () => {
    expect(evaluateSubagentSpawn({ depth: 0, parentTools: ["web_search", "memory_search"], requestedTools: ["web_search"] }).decision).toBe("allow");
    expect(evaluateSubagentSpawn({ depth: 0, parentTools: ["web_search"], requestedTools: ["github_write"] }).code).toBe("subagent_permission_escalation");
    expect(evaluateSubagentSpawn({ depth: 2, maxDepth: 2, parentTools: ["web_search"], requestedTools: ["web_search"] }).code).toBe("subagent_depth_exceeded");
  });
});
