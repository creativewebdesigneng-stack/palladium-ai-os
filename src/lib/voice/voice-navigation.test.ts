import { describe, expect, it } from "vitest";
import {
  isDuplicateVoiceTranscript,
  normalizeVoiceTranscript,
  resolveVoiceNavigationIntent,
} from "./voice-navigation";

describe("voice navigation", () => {
  it("opens projects from a natural voice command", () => {
    expect(resolveVoiceNavigationIntent("open projects")?.to).toBe("/projects");
    expect(resolveVoiceNavigationIntent("show me my projects")?.to).toBe("/projects");
  });

  it("resolves create intents before generic project and agent intents", () => {
    expect(resolveVoiceNavigationIntent("create a project")?.id).toBe("create-project");
    expect(resolveVoiceNavigationIntent("create a new agent")?.id).toBe("create-agent");
    expect(resolveVoiceNavigationIntent("open agent builder")?.to).toBe("/agent-builder");
  });

  it("maps verified app routes", () => {
    expect(resolveVoiceNavigationIntent("open dashboard")?.to).toBe("/dashboard");
    expect(resolveVoiceNavigationIntent("open mission control")?.to).toBe("/mission-control");
    expect(resolveVoiceNavigationIntent("open fast track")?.to).toBe("/fast-track");
    expect(resolveVoiceNavigationIntent("open integrations")?.to).toBe("/integrations");
    expect(resolveVoiceNavigationIntent("open 3d studio")?.to).toBe("/three-d-studio");
    expect(resolveVoiceNavigationIntent("open runtime models")?.to).toBe("/models");
  });
});

describe("voice transcript normalization and dedupe", () => {
  it("normalizes punctuation and spacing", () => {
    expect(normalizeVoiceTranscript("  Open,   Projects! ")).toBe("open projects");
  });

  it("deduplicates the same transcript inside the voice overlap window", () => {
    const previous = { text: "open projects", at: 10_000 };
    expect(isDuplicateVoiceTranscript("Open projects!", previous, 14_000)).toBe(true);
    expect(isDuplicateVoiceTranscript("Open projects!", previous, 17_000)).toBe(false);
    expect(isDuplicateVoiceTranscript("Open agents", previous, 12_000)).toBe(false);
  });
});
