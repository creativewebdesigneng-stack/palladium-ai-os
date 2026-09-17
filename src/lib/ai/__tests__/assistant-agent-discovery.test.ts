import { describe, expect, it } from "vitest";
import { assistantAgentDiscoveryContext, discoverAssistantAgents } from "../assistant-agent-discovery";

const candidates = [
  { id: "billing", name: "Billing Agent", category: "finance", purpose: "Handle invoices and billing", allowed_tools: ["invoice.read"] },
  { id: "design", name: "Design Agent", category: "design", purpose: "Inspect UI layouts and accessibility", allowed_tools: ["browser.read"] },
  { id: "research", name: "Research Agent", category: "research", purpose: "Research current information", allowed_tools: ["web_search"] },
];

describe("assistant agent discovery", () => {
  it("reuses deterministic orchestration ranking without executing agents", () => {
    const matches = discoverAssistantAgents("inspect the design layout", candidates, 2);
    expect(matches).toHaveLength(2);
    expect(matches[0]?.id).toBe("design");
    expect(matches[0]?.tools).toEqual(["browser.read"]);
  });

  it("bounds results and states that discovery grants no execution permission", () => {
    const matches = discoverAssistantAgents("research", candidates, 99);
    expect(matches.length).toBeLessThanOrEqual(12);
    const context = assistantAgentDiscoveryContext("research", matches);
    expect(context).toContain("read-only discovery results");
    expect(context).toContain("Discovery does not grant permission to execute");
    expect(context).toContain("approval and audit controls");
  });

  it("returns no matches for an empty goal", () => {
    expect(discoverAssistantAgents("   ", candidates)).toEqual([]);
  });
});
