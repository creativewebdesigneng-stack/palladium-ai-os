import { describe, expect, it } from "vitest";
import {
  assertSkillScriptToolsSafe,
  inheritedAgentToolNames,
  isSkillScriptToolSafe,
} from "@/lib/runtime/agent-skills/skill-script-policy";

describe("controlled skill-script policy", () => {
  it("allows bounded read and internal data tools", () => {
    for (const tool of [
      "current_time",
      "calculator",
      "web_search",
      "web_fetch",
      "memory_search",
      "memory_write",
      "connected_service",
      "integration_capabilities",
      "file_analysis",
      "data_analysis",
      "database_query",
    ]) {
      expect(isSkillScriptToolSafe(tool)).toBe(true);
    }
  });

  it("blocks tools that can write, spend, execute code, browse interactively, or need independent approval", () => {
    for (const tool of [
      "skill_script",
      "request_approval",
      "email_send",
      "email_draft",
      "slack_post",
      "prepare_purchase",
      "connected_service_write",
      "integration_action",
      "nango_action",
      "github_write",
      "browser",
      "browser_task",
      "http_request",
      "calendar",
      "code_exec",
    ]) {
      expect(isSkillScriptToolSafe(tool)).toBe(false);
    }
    expect(() => assertSkillScriptToolsSafe(["web_search", "email_send"])).toThrow(/requested separately/);
  });

  it("inherits read-only capability discovery from connected_service", () => {
    const tools = inheritedAgentToolNames(["connected_service", "web_search"]);
    expect([...tools]).toEqual(expect.arrayContaining([
      "connected_service",
      "integration_capabilities",
      "nango_capabilities",
      "web_search",
    ]));
    expect(tools.has("integration_action")).toBe(false);
  });
});
