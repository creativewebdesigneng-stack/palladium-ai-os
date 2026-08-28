import { describe, expect, it, vi } from "vitest";
import { parseSkillScriptRecipe, runLoadedSkillScript } from "@/lib/runtime/agent-skills/skill-script-runner.server";

describe("controlled agent skill scripts", () => {
  it("accepts only manifest-declared tools", () => {
    const recipe = JSON.stringify({ version: 1, steps: [{ tool: "web_fetch", input: { url: "https://example.com" } }] });
    expect(parseSkillScriptRecipe(recipe, ["web_fetch"]).steps).toHaveLength(1);
    expect(() => parseSkillScriptRecipe(recipe, ["database_query"])).toThrow(/not declared/);
  });

  it("rejects recursive skill execution and non-JSON recipe versions", () => {
    expect(() => parseSkillScriptRecipe(JSON.stringify({ version: 1, steps: [{ tool: "skill_script", input: {} }] }), ["skill_script"])).toThrow(/recursively/);
    expect(() => parseSkillScriptRecipe(JSON.stringify({ version: 2, steps: [{ tool: "web_fetch", input: {} }] }), ["web_fetch"])).toThrow(/version/);
  });

  it("materializes bounded scalar parameters and delegates every step to the native executor", async () => {
    const parsed = parseSkillScriptRecipe(JSON.stringify({
      version: 1,
      steps: [
        { tool: "web_fetch", input: { url: "{{target}}" } },
        { tool: "database_query", input: { table: "agent_tasks", limit: "{{limit}}" } },
      ],
    }), ["web_fetch", "database_query"]);
    const execute = vi.fn(async (tool: string, input: Record<string, unknown>) => ({ ok: true, output: { tool, input } }));
    const result = await runLoadedSkillScript({ recipe: parsed, params: { target: "https://example.com", limit: 3 }, execute });
    expect(result.ok).toBe(true);
    expect(execute).toHaveBeenNthCalledWith(1, "web_fetch", { url: "https://example.com" });
    expect(execute).toHaveBeenNthCalledWith(2, "database_query", { table: "agent_tasks", limit: 3 });
  });

  it("stops after the first failed native tool call", async () => {
    const parsed = parseSkillScriptRecipe(JSON.stringify({ version: 1, steps: [
      { tool: "web_fetch", input: { url: "https://example.com" } },
      { tool: "database_query", input: { table: "agent_tasks" } },
    ] }), ["web_fetch", "database_query"]);
    const execute = vi.fn().mockResolvedValueOnce({ ok: false, output: { error: "denied" } });
    const result = await runLoadedSkillScript({ recipe: parsed, execute });
    expect(result.ok).toBe(false);
    expect(result.steps_completed).toBe(1);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("rejects sensitive parameters and sensitive input fields before native execution", async () => {
    const parsed = parseSkillScriptRecipe(JSON.stringify({ version: 1, steps: [{ tool: "web_fetch", input: { url: "{{target}}" } }] }), ["web_fetch"]);
    await expect(runLoadedSkillScript({ recipe: parsed, params: { api_key: "secret" }, execute: async () => ({ ok: true, output: {} }) })).rejects.toThrow(/Sensitive parameter/);

    const sensitive = parseSkillScriptRecipe(JSON.stringify({ version: 1, steps: [{ tool: "http_request", input: { authorization: "x" } }] }), ["http_request"]);
    await expect(runLoadedSkillScript({ recipe: sensitive, execute: async () => ({ ok: true, output: {} }) })).rejects.toThrow(/forbidden/);
  });
});
