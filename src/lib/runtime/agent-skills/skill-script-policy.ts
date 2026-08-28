export const SKILL_SCRIPT_SAFE_TOOLS = new Set([
  "current_time",
  "calculator",
  "web_search",
  "web_fetch",
  "memory_search",
  "memory_write",
  "connected_service",
  "integration_capabilities",
  "nango_capabilities",
  "file_analysis",
  "data_analysis",
  "database_query",
]);

export function isSkillScriptToolSafe(tool: string): boolean {
  return SKILL_SCRIPT_SAFE_TOOLS.has(tool);
}

export function assertSkillScriptToolsSafe(tools: Iterable<string>): void {
  for (const tool of tools) {
    if (!isSkillScriptToolSafe(tool)) {
      throw new Error(
        `Skill script tool "${tool}" cannot run inside a bundled recipe. ` +
          "Tools that can write externally, spend money, execute code, drive a browser, or require their own approval must be requested separately.",
      );
    }
  }
}

export function inheritedAgentToolNames(allowedTools: readonly string[]): Set<string> {
  const tools = new Set(allowedTools);
  if (tools.has("connected_service")) {
    tools.add("integration_capabilities");
    tools.add("nango_capabilities");
  }
  return tools;
}
