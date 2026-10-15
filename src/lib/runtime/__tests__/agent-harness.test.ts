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

  it("rejects a requested web domain when the allowlist is absent or empty", () => {
    const request = { tool: "web_fetch", requestedDomains: ["example.com"] };
    expect(evaluateHarnessPolicy(request).code).toBe("domain_outside_allowlist");
    expect(evaluateHarnessPolicy({ ...request, allowedDomains: [] }).decision).toBe("deny");
    expect(evaluateHarnessPolicy({ ...request, allowedDomains: ["example.com"] }).decision).toBe("allow");
  });

  it("prevents sub-agents escalating tools or nesting indefinitely", () => {
    expect(evaluateSubagentSpawn({ depth: 0, parentTools: ["web_search", "memory_search"], requestedTools: ["web_search"] }).decision).toBe("allow");
    expect(evaluateSubagentSpawn({ depth: 0, parentTools: ["web_search"], requestedTools: ["github_write"] }).code).toBe("subagent_permission_escalation");
    expect(evaluateSubagentSpawn({ depth: 2, maxDepth: 2, parentTools: ["web_search"], requestedTools: ["web_search"] }).code).toBe("subagent_depth_exceeded");
  });

  it('does not discard a disallowed target beyond the network scope limit',()=>{
    const requested=[...Array(50).fill('example.com'),'evil.test'];
    expect(evaluateHarnessPolicy({tool:'web_fetch',requestedDomains:requested,allowedDomains:['example.com']}).code).toBe('invalid_domain_scope');
  });

  it('rejects malformed or credential-bearing scopes instead of silently normalizing them',()=>{
    for(const target of ['https://user:secret@example.com','file://example.com','*.example.com','http://','bad host']){
      expect(evaluateHarnessPolicy({tool:'web_fetch',requestedDomains:[target],allowedDomains:['example.com']}).decision).toBe('deny');
    }
    expect(evaluateHarnessPolicy({tool:'web_fetch',requestedDomains:['example.com'],allowedDomains:['https://user:secret@example.com']}).code).toBe('invalid_domain_scope');
  });

  it('normalizes URL hostnames consistently while retaining exact subdomain boundaries',()=>{
    expect(evaluateHarnessPolicy({tool:'web_fetch',requestedDomains:['https://docs.example.com:443/page'],allowedDomains:['https://WWW.Example.com/path']}).decision).toBe('allow');
    expect(evaluateHarnessPolicy({tool:'web_fetch',requestedDomains:['example.com.evil.test'],allowedDomains:['example.com']}).decision).toBe('deny');
  });
});
