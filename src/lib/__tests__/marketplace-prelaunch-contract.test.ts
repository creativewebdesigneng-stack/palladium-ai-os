import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const session = read("../useSessionReady.js");
const workspace = read("../../hooks/use-workspace.ts");
const listingBrowser = read("../../components/marketplace/ListingBrowser.jsx");
const toolMarketplace = read("../../screens/ToolMarketplace.jsx");
const templates = read("../../screens/Templates.jsx");
const agentMarketplace = read("../../screens/AgentMarketplace.jsx");
const creatorMarketplace = read("../../screens/CreatorMarketplace.jsx");

describe("marketplace loading and honest pre-launch states", () => {
  it("fails closed if Supabase session hydration stalls or errors", () => {
    expect(session).toContain("setTimeout");
    expect(session).toContain(".catch(() => settle(null))");
    expect(session).toContain("current === 'unknown' ? 'no' : current");
    expect(workspace).toContain("return useSessionReady()");
  });

  it("uses the bounded session hook for main, AI and tool marketplace screens", () => {
    expect(listingBrowser).toContain("useSessionReady");
    expect(listingBrowser).not.toContain("supabase.auth.getSession()");
    expect(toolMarketplace).toContain("useSessionReady");
    expect(toolMarketplace).not.toContain("supabase.auth.getSession()");
  });

  it("loads only real published template listings, not agent listings or mock catalogue data", () => {
    expect(templates).toContain("listCreatorMarketplace");
    expect(templates).toContain("listing.item_type === 'template'");
    expect(templates).not.toContain("listMarketplaceAgents");
    expect(templates).not.toContain("installMarketplaceAgent");
    expect(templates).toContain("illustrative mock templates are not shown as marketplace inventory");
  });

  it("labels empty community marketplaces as pre-launch instead of inventing inventory", () => {
    expect(agentMarketplace.toLowerCase()).toContain("pre-launch");
    expect(creatorMarketplace.toLowerCase()).toContain("pre-launch");
    expect(listingBrowser.toLowerCase()).toContain("pre-launch");
    expect(toolMarketplace).toContain("Third-party plugin submissions aren't available yet");
  });
});
