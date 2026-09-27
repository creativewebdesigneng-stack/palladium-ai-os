import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("Blackstar visual performance contract", () => {
  const shell = readFileSync(new URL("../../components/palladium/AppShell.jsx", import.meta.url), "utf8");
  const agents = readFileSync(new URL("../../screens/Agents.jsx", import.meta.url), "utf8");
  const workforce = readFileSync(new URL("../../screens/Workforce.jsx", import.meta.url), "utf8");
  const neuralSpace = readFileSync(new URL("../../components/visual/NeuralSpace.jsx", import.meta.url), "utf8");
  const depth = readFileSync(new URL("../../components/blackstar/AstraDepthField.jsx", import.meta.url), "utf8");

  it("keeps one shell-owned ambient canvas instead of stacking page-level full-screen canvases", () => {
    expect(agents).not.toContain("AnimatedBrain");
    expect(workforce).not.toContain("NeuralNetworkBackground");
    expect(shell).toContain("<AstraDepthField room={room} />");
  });

  it("does not stack the shell WebGL depth field on Game Foundry's dedicated Three.js viewer", () => {
    expect(shell).toContain("const dedicatedWebGL = pathname.startsWith('/game-foundry')");
    expect(shell).toContain("!dedicatedWebGL ? <AstraDepthField room={room} /> : null");
  });

  it("caps mobile 2D canvas pixel density and fails safely when a 2D context is unavailable", () => {
    expect(neuralSpace).toContain("if (!ctx) return;");
    expect(neuralSpace).toContain("mobile ? 1.25 : 1.75");
  });

  it("stops rendering instead of crashing the route when WebGL context is lost", () => {
    expect(depth).toContain("webglcontextlost");
    expect(depth).toContain("contextLost = true");
    expect(depth).toContain("disposed || contextLost || !renderer || !scene || !camera");
    expect(depth).toContain("removeEventListener('webglcontextlost'");
  });
});
