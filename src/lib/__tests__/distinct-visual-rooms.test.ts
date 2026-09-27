import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { blackstarRoomForPath, ROOM_LABELS } from "../../components/blackstar/visualRooms";

describe("Blackstar distinct 3D room identities", () => {
  it("gives major platform domains their own visual rooms", () => {
    expect(blackstarRoomForPath("/mission-control")).toBe("astra-room-mission");
    expect(blackstarRoomForPath("/ai-hub")).toBe("astra-room-hub");
    expect(blackstarRoomForPath("/agents")).toBe("astra-room-workforce");
    expect(blackstarRoomForPath("/finance")).toBe("astra-room-finance");
    expect(blackstarRoomForPath("/trading-hub")).toBe("astra-room-trading");
    expect(blackstarRoomForPath("/legal")).toBe("astra-room-legal");
    expect(blackstarRoomForPath("/compliance-sentinel")).toBe("astra-room-compliance");
    expect(blackstarRoomForPath("/cinema-studio")).toBe("astra-room-cinema");
    expect(blackstarRoomForPath("/game-foundry")).toBe("astra-room-game");
    expect(blackstarRoomForPath("/memory")).toBe("astra-room-memory");
    expect(blackstarRoomForPath("/knowledge")).toBe("astra-room-knowledge");
    expect(blackstarRoomForPath("/company-hub")).toBe("astra-room-company");
    expect(blackstarRoomForPath("/industry-hub")).toBe("astra-room-industry");
    expect(blackstarRoomForPath("/retail-hub")).toBe("astra-room-commerce");
    expect(blackstarRoomForPath("/website-studio")).toBe("astra-room-builder");
    expect(blackstarRoomForPath("/admin")).toBe("astra-room-admin");
  });

  it("keeps unknown areas on the stable default environment", () => {
    expect(blackstarRoomForPath("/settings")).toBe("astra-room-default");
    expect(blackstarRoomForPath("/billing")).toBe("astra-room-default");
  });

  it("uses Blackstar-specific labels for the new visual rooms", () => {
    for (const room of [
      "astra-room-trading", "astra-room-compliance", "astra-room-cinema",
      "astra-room-game", "astra-room-knowledge", "astra-room-company",
      "astra-room-industry", "astra-room-commerce", "astra-room-builder",
    ]) {
      expect(ROOM_LABELS[room as keyof typeof ROOM_LABELS]).toMatch(/^Blackstar /);
    }
  });

  it("uses one shell depth renderer rather than page-specific 3D stacks", () => {
    const shell = readFileSync(new URL("../../components/palladium/AppShell.jsx", import.meta.url), "utf8");
    expect(shell).toContain("blackstarRoomForPath(pathname)");
    expect(shell.match(/<AstraDepthField/g)?.length).toBe(1);
    expect(shell).toContain("const dedicatedWebGL = pathname.startsWith('/game-foundry')");
  });

  it("defines distinct geometry/palette and atmosphere for the new rooms", () => {
    const depth = readFileSync(new URL("../../components/blackstar/AstraDepthField.jsx", import.meta.url), "utf8");
    const css = readFileSync(new URL("../../components/blackstar/blackstar-astra.css", import.meta.url), "utf8");
    for (const room of ["trading","compliance","cinema","game","knowledge","company","industry","commerce","builder"]) {
      expect(depth).toContain(`'astra-room-${room}'`);
      expect(css).toContain(`.astra-room-${room} .astra-room-wash`);
    }
    expect(depth).toContain("TorusKnotGeometry");
    expect(depth).toContain("ConeGeometry");
  });
});
