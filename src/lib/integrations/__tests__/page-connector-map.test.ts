import { describe, expect, it } from "vitest";
import {
  pageConnectorCatalogue,
  pageConnectorRecommendations,
} from "../page-connector-map";

describe("route-aware page connector recommendations", () => {
  it("maps creative studios to existing creative connector targets", () => {
    const ids = pageConnectorRecommendations("/cinema-studio").map((item) => item.id);
    expect(ids).toContain("huggingface");
    expect(ids).toContain("runway");
    expect(ids).toContain("higgsfield");
    expect(ids).toContain("adobe");
    expect(ids).toContain("canva");
    expect(ids).toContain("heygen");
  });

  it("prioritizes website production connectors on Website Studio", () => {
    const ids = pageConnectorRecommendations("/website-studio").map((item) => item.id);
    expect(ids).toContain("webflow");
    expect(ids).toContain("lovable");
    expect(ids).toContain("figma");
    expect(ids).toContain("semrush");
  });

  it("maps developer surfaces to Blackstar providers plus clearly bounded candidates", () => {
    const matches = pageConnectorRecommendations("/developer-workspace", 12);
    const ids = matches.map((item) => item.id);
    expect(ids).toContain("github");
    expect(ids).toContain("figma");
    expect(ids).toContain("vercel");
    expect(ids).toContain("supabase");
    expect(ids).toContain("atlassian");
    expect(matches.find((item) => item.id === "github")?.state).toBe("supported");
    expect(matches.find((item) => item.id === "vercel")?.state).toBe("candidate");
  });

  it("maps marketing surfaces to governed social providers and current analytics candidates", () => {
    const ids = pageConnectorRecommendations("/marketing", 16).map((item) => item.id);
    expect(ids).toContain("meta");
    expect(ids).toContain("youtube");
    expect(ids).toContain("semrush");
    expect(ids).toContain("ahrefs");
    expect(ids).toContain("supermetrics");
    expect(ids).toContain("metricool");
  });

  it("prioritizes product analytics providers without claiming Blackstar support", () => {
    const matches = pageConnectorRecommendations("/product-analytics");
    expect(matches.find((item) => item.id === "amplitude")?.state).toBe("candidate");
    expect(matches.find((item) => item.id === "posthog")?.state).toBe("candidate");
  });

  it("maps commerce and billing to the existing Shopify and Stripe paths", () => {
    const commerce = pageConnectorRecommendations("/commerce-studio", 12);
    expect(commerce.find((item) => item.id === "shopify")?.state).toBe("supported");
    expect(commerce.find((item) => item.id === "stripe")?.state).toBe("native");

    const billing = pageConnectorRecommendations("/billing", 12);
    expect(billing.find((item) => item.id === "stripe")?.state).toBe("native");
  });

  it("maps knowledge and file surfaces to existing workspace connectors and storage candidates", () => {
    const ids = pageConnectorRecommendations("/files-analysis", 12).map((item) => item.id);
    expect(ids).toContain("google");
    expect(ids).toContain("microsoft");
    expect(ids).toContain("notion");
    expect(ids).toContain("dropbox");
    expect(ids).toContain("box");
    expect(ids).toContain("sharepoint");
    expect(ids).toContain("coda");
  });

  it("offers fitness-specific candidates without fabricating Blackstar support", () => {
    const matches = pageConnectorRecommendations("/health-fitness", 12);
    expect(matches.find((item) => item.id === "coros")?.state).toBe("candidate");
    expect(matches.find((item) => item.id === "caliber")?.state).toBe("candidate");
  });

  it("keeps ChatGPT catalogue discoveries explicitly non-executable until Blackstar integrates them", () => {
    const candidates = Object.values(pageConnectorCatalogue).filter(
      (item) => item.source === "chatgpt-catalogue",
    );
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every((item) => item.state === "candidate")).toBe(true);
    expect(candidates.every((item) => !/connected|verified|certified/i.test(item.reason))).toBe(true);
    expect(candidates.every((item) => !/chatgpt/i.test(item.reason))).toBe(true);
  });

  it("returns no recommendation for a route with no meaningful connector match", () => {
    expect(pageConnectorRecommendations("/route-that-does-not-exist")).toEqual([]);
  });
});
