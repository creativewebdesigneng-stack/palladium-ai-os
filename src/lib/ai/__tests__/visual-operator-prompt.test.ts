import { describe, expect, it } from "vitest";
import { normaliseVisualOperatorInput, openAiVisionContent, visualOperatorInstructions } from "../visual-operator-prompt";

const surface = {
  route: "/ai-hub",
  title: "AI Hub",
  status: "error" as const,
  consoleErrors: ["Widget failed to render"],
  networkErrors: ["GET /api/models — 500"],
  runtimeErrors: [],
};

describe("Blackstar Visual Operator prompt", () => {
  it("combines observed QA evidence with a bounded PNG image", () => {
    const screenshotDataUrl = "data:image/png;base64,cG5n";
    const content = openAiVisionContent({ surface, screenshotDataUrl });
    expect(content[0].type).toBe("text");
    expect(content[1]).toEqual({ type: "image_url", image_url: { url: screenshotDataUrl, detail: "high" } });
    expect(visualOperatorInstructions(surface)).toContain("Widget failed to render");
    expect(visualOperatorInstructions(surface)).toContain("Do not claim anything about pages or interactions not present");
  });

  it("rejects non-PNG screenshot payloads", () => {
    expect(() => normaliseVisualOperatorInput({ surface, screenshotDataUrl: "https://example.com/page.png" })).toThrow(/bounded PNG/);
  });
});
