import { describe, expect, it } from "vitest";
import {
  normalizeProviderIdentity,
  providerTargetMatches,
  resolveProviderTargetMatch,
} from "../provider-target-routing";

describe("provider target runtime routing", () => {
  it("normalizes punctuation and spacing without fuzzy substring matching", () => {
    expect(normalizeProviderIdentity("Hugging-Face")).toBe("huggingface");
    expect(providerTargetMatches(
      { id: "huggingface", name: "Hugging Face" },
      { id: "hugging-face", name: "Hugging Face" },
    )).toBe(true);
    expect(providerTargetMatches(
      { id: "sharepoint", name: "SharePoint" },
      { id: "microsoft", name: "Microsoft 365" },
    )).toBe(false);
  });

  it("resolves explicit safe aliases for known provider identity variants", () => {
    expect(resolveProviderTargetMatch(
      { id: "sharepoint", name: "SharePoint" },
      [{ id: "microsoft-sharepoint", name: "Microsoft SharePoint" }],
    )?.id).toBe("microsoft-sharepoint");
    expect(resolveProviderTargetMatch(
      { id: "adobe", name: "Adobe Creative Cloud" },
      [{ id: "adobe-creative-cloud", name: "Adobe Creative Cloud" }],
    )?.id).toBe("adobe-creative-cloud");
    expect(resolveProviderTargetMatch(
      { id: "posthog", name: "PostHog" },
      [{ id: "post-hog", name: "PostHog" }],
    )?.id).toBe("post-hog");
  });

  it("prefers exact canonical ids and fails closed on ambiguous equal matches", () => {
    const exact = resolveProviderTargetMatch(
      { id: "runway", name: "Runway" },
      [
        { id: "runwayml", name: "Runway" },
        { id: "runway", name: "Runway API" },
      ],
    );
    expect(exact?.id).toBe("runway");

    const ambiguous = resolveProviderTargetMatch(
      { id: "heygen", name: "HeyGen" },
      [
        { id: "hey-gen", name: "HeyGen" },
        { id: "heygen-alt", name: "HeyGen" },
      ],
    );
    expect(ambiguous).toBeNull();
  });
});
