import { describe, expect, it } from "vitest";
import { assistantActivityLabel, sanitizeAssistantActivity } from "./assistant-activity";

describe("assistant activity", () => {
  it("keeps supported lifecycle states and bounds public metadata", () => {
    const activity = sanitizeAssistantActivity({
      state: "thinking",
      source: "text",
      label: "Planning\nrequest",
      detail: "x".repeat(500),
      provider: "openai",
      model: "gpt-test",
    });
    expect(activity.state).toBe("thinking");
    expect(activity.label).toBe("Planning request");
    expect(activity.detail?.length).toBe(180);
    expect(activity.provider).toBe("openai");
  });

  it("falls back to idle for unknown states", () => {
    const activity = sanitizeAssistantActivity({ state: "unknown" as never });
    expect(activity.state).toBe("idle");
    expect(assistantActivityLabel(activity.state)).toBe("Ready");
  });
});
