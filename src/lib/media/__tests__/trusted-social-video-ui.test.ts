import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const screen = readFileSync("src/screens/TrustedSocialVideo.jsx", "utf8");
const route = readFileSync("src/routes/_shell/_app/trusted-social-video.tsx", "utf8");
const sidebar = readFileSync("src/components/palladium/Sidebar.jsx", "utf8");

describe("Trusted Social Video browser contract", () => {
  it("uses the authenticated signed-upload and server verification path", () => {
    expect(screen).toContain("beginTrustedMediaUpload");
    expect(screen).toContain("finalizeTrustedMediaUpload");
    expect(screen).toContain("listTrustedMediaAssets");
    expect(screen).toContain('method: "PUT"');
    expect(screen).toContain('"Content-Type": "video/mp4"');
    expect(screen).toContain("512 * 1024 * 1024");
  });

  it("does not accept arbitrary remote provider source URLs or credentials", () => {
    expect(screen).not.toMatch(/placeholder=["'][^"']*(source url|video url|access token|api key|client secret|password)/i);
    expect(screen).not.toContain("PULL_FROM_URL");
    expect(screen).toContain("private trusted-media bucket");
    expect(screen).toContain("Only assets marked");
  });

  it("is a first-class Blackstar route and navigation destination", () => {
    expect(route).toContain('createFileRoute("/_shell/_app/trusted-social-video")');
    expect(route).toContain("Trusted Social Video — Blackstar");
    expect(sidebar).toContain("['Trusted Social Video', '/trusted-social-video', Clapperboard]");
    expect(screen).toContain('to="/social-operations"');
  });
});
