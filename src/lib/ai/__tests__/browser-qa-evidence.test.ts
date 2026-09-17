import { describe, expect, it } from "vitest";
import { normaliseBrowserQaEvidence } from "../browser-qa-evidence";

describe("browser QA evidence", () => {
  it("keeps screenshot bytes separate from assistant surface metadata", () => {
    const result = normaliseBrowserQaEvidence("/ai-hub", {
      readOnly: true,
      title: "AI Hub",
      status: 200,
      screenshotDataUrl: "data:image/png;base64,cG5n",
      consoleErrors: ["render failed"],
      networkErrors: ["GET https://blackstar.example/api/x — failed"],
      checkedAt: "2026-09-17T21:00:00.000Z",
    });
    expect(result.surface.screenshotAvailable).toBe(true);
    expect(result.surface.status).toBe("warning");
    expect(result.screenshotDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(JSON.stringify(result.surface)).not.toContain("cG5n");
  });

  it("rejects evidence that is not explicitly read-only", () => {
    expect(() => normaliseBrowserQaEvidence("/ai-hub", { readOnly: false })).toThrow(
      "rejected non-read-only browser evidence",
    );
  });

  it("marks HTTP failures as errors", () => {
    const result = normaliseBrowserQaEvidence("/finance", { readOnly: true, status: 500 });
    expect(result.surface.status).toBe("error");
  });
});
