import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { blackstarVisualStyleForPath, VISUAL_STYLE_LABELS } from "../../components/blackstar/visualRooms";

describe("Blackstar ten visual worlds", () => {
  it("exposes all ten named visual identities", () => {
    expect(Object.values(VISUAL_STYLE_LABELS)).toEqual([
      "Cosmic Core",
      "Orbital Elegance",
      "Mission Control",
      "Neon Infrastructure",
      "Elite Corporate",
      "Industry Realism",
      "Creative Universe",
      "AI Nexus",
      "Trading Command",
      "Ethereal Luxury",
    ]);
  });

  it("assigns flagship areas to their intended style", () => {
    const cases: Record<string, string> = {
      "/dashboard": "blackstar-style-cosmic-core",
      "/knowledge": "blackstar-style-orbital-elegance",
      "/mission-control": "blackstar-style-mission-control",
      "/projects": "blackstar-style-neon-infrastructure",
      "/company-hub": "blackstar-style-elite-corporate",
      "/industry-hub": "blackstar-style-industry-realism",
      "/cinema-studio": "blackstar-style-creative-universe",
      "/ai-hub": "blackstar-style-ai-nexus",
      "/trading-hub": "blackstar-style-trading-command",
      "/human-frontier": "blackstar-style-ethereal-luxury",
    };
    for (const [path, style] of Object.entries(cases)) {
      expect(blackstarVisualStyleForPath(path)).toBe(style);
    }
  });

  it("keeps related routes inside the same design world", () => {
    for (const path of ["/agents", "/workforce", "/models", "/mcp-hub", "/skills"]) {
      expect(blackstarVisualStyleForPath(path)).toBe("blackstar-style-ai-nexus");
    }
    for (const path of ["/game-foundry", "/three-d-studio", "/website-studio", "/creator-hub"]) {
      expect(blackstarVisualStyleForPath(path)).toBe("blackstar-style-creative-universe");
    }
    for (const path of ["/construction-industrial-hub", "/retail-hub", "/commerce-studio", "/marketplace"]) {
      expect(blackstarVisualStyleForPath(path)).toBe("blackstar-style-industry-realism");
    }
    for (const path of ["/finance", "/compliance-sentinel", "/admin/users", "/organisation"]) {
      expect(blackstarVisualStyleForPath(path)).toBe("blackstar-style-elite-corporate");
    }
  });

  it("mounts style identity on the shell and passes it into the WebGL depth field", () => {
    const shell = readFileSync(
      new URL("../../components/palladium/AppShell.jsx", import.meta.url),
      "utf8",
    );
    expect(shell).toContain("blackstarVisualStyleForPath(pathname)");
    expect(shell).toContain("data-blackstar-style={visualStyle}");
    expect(shell).toContain("<AstraDepthField room={room} visualStyle={visualStyle} />");
    expect(shell).toContain('className="blackstar-style-atmosphere pointer-events-none fixed inset-0 -z-15"');
  });

  it("defines a distinct atmospheric treatment for every visual world", () => {
    const css = readFileSync(
      new URL("../../components/blackstar/blackstar-astra.css", import.meta.url),
      "utf8",
    );
    for (const style of Object.keys(VISUAL_STYLE_LABELS)) {
      expect(css).toContain("." + style + " .blackstar-style-atmosphere");
    }
    expect(css).toContain("@keyframes blackstar-command-scan");
    expect(css).toContain("@keyframes blackstar-neon-rise");
  });
});
