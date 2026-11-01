import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normaliseToolEvidenceExtra } from "./tool-denial-evidence.server";

const core = readFileSync(new URL("./tools-core.server.ts", import.meta.url), "utf8");
const extensions = readFileSync(new URL("./tools.server.ts", import.meta.url), "utf8");
const types = readFileSync(new URL("../../integrations/supabase/types.ts", import.meta.url), "utf8");
const api = readFileSync(new URL("../../../scripts/verification/enterprise-workforce-api-uat.mjs", import.meta.url), "utf8");

describe("Blackstar canonical denied-tool evidence (QA)", () => {
  it("redacts policy details and moves discriminator into schema-backed JSON input", () => {
    const original = { error: "Request denied", policy_code: "HARNESS_BLOCKED", input: { secret: "sensitive" } };
    const normalised = normaliseToolEvidenceExtra(original);
    expect(normalised).toEqual({
      error: "Request denied",
      input: { redacted: true, policy_code: "HARNESS_BLOCKED" },
    });
    expect(original.input).toEqual({ secret: "sensitive" });
    expect(normalised).not.toHaveProperty("policy_code");
    expect(JSON.stringify(normalised)).not.toContain("sensitive");
  });

  it("preserves ordinary successful tool evidence without inventing policy fields", () => {
    expect(normaliseToolEvidenceExtra({ output: { count: 2 }, duration_ms: 7 })).toEqual({
      output: { count: 2 }, duration_ms: 7,
    });
    expect(normaliseToolEvidenceExtra({ policy_code: null, error: "unavailable" }))
      .toEqual({ error: "unavailable" });
  });

  it("rejects unbounded/malformed denial discriminators", () => {
    for (const value of [12, [], {}, "NOT ALLOWED", "", "X".repeat(81), "thing\nsecret"]) {
      expect(() => normaliseToolEvidenceExtra({ policy_code: value })).toThrow();
    }
  });

  it("matches the generated Supabase tool execution schema and UAT projection", () => {
    const section = types.split("tool_executions: {")[1]?.split("Relationships:")[0];
    expect(section).toContain("input: Json");
    expect(section).not.toMatch(/^\s+policy_code:/m);
    expect(api).toContain("tool,status,input,created_at");
    expect(api).toContain("row.input?.policy_code");
    expect(api).not.toContain("tool,status,policy_code");
  });

  it("keeps both runtime write points on the single canonical table and required audit gate", () => {
    for (const source of [core, extensions]) {
      expect(source).toContain('ctx.sb.from("tool_executions").insert(');
      expect(source).toContain("normaliseToolEvidenceExtra(extra)");
      expect(source).toContain("Tool execution evidence could not be persisted.");
      expect(source).toContain("writeRequiredToolPolicyDenial(ctx, name,");
    }
    expect(core).toContain("writeRequiredToolPolicyDenial(ctx, name, sandboxPolicy.code)");
    expect(api).toContain("agent.tool_policy_denied");
    expect(api).toContain("row.metadata?.policy_code");
  });
});
