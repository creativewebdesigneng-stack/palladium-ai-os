import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";

const manifest = JSON.parse(
  readFileSync(new URL("../../../e2e/route-manifest.json", import.meta.url), "utf8"),
);

describe("investor-facing route acceptance manifest", () => {
  it("tracks the About page as a public, indexable route", () => {
    const about = manifest.signedOutPublic.find((entry) => entry.path === "/about");
    expect(about).toMatchObject({
      file: "src/routes/about.tsx",
      marker: "About Blackstar",
      allowNoindex: false,
    });
    expect(existsSync(new URL("../../../src/routes/about.tsx", import.meta.url))).toBe(true);
  });

  it("tracks the legacy Cinema route as a redirect, not a second page", () => {
    const cinema = manifest.signedOutRedirects.find((entry) => entry.path === "/cinema");
    expect(cinema).toMatchObject({
      file: "src/routes/cinema.tsx",
      redirectTo: "/cinema-studio",
      marker: "Cinema Studio — Blackstar",
    });
    expect(existsSync(new URL("../../../src/routes/cinema.tsx", import.meta.url))).toBe(true);
    expect(readFileSync(new URL("../../../src/routes/cinema.tsx", import.meta.url), "utf8")).toContain('statusCode: 308');
  });

  it("tracks the XML sitemap as a real public asset", () => {
    const sitemap = manifest.signedOutAssets.find((entry) => entry.path === "/sitemap.xml");
    expect(sitemap).toMatchObject({
      file: "public/sitemap.xml",
      contentType: "xml",
      marker: "https://palladium-ai-os.vercel.app/about",
    });
    expect(existsSync(new URL("../../../public/sitemap.xml", import.meta.url))).toBe(true);
    expect(readFileSync(new URL("../../../public/sitemap.xml", import.meta.url), "utf8")).toContain("<urlset");
  });
});
