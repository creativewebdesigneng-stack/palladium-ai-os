import { describe, expect, it } from "vitest";
import { DEFAULT_VOICE_ASSISTANT_PREFERENCES } from "./voice-assistant.functions";

describe("ambient voice assistant defaults", () => {
  it("starts enabled, unmuted and fully hands-free", () => {
    expect(DEFAULT_VOICE_ASSISTANT_PREFERENCES.enabled).toBe(true);
    expect(DEFAULT_VOICE_ASSISTANT_PREFERENCES.muted).toBe(false);
    expect(DEFAULT_VOICE_ASSISTANT_PREFERENCES.wake_word_enabled).toBe(false);
    expect(DEFAULT_VOICE_ASSISTANT_PREFERENCES.announce_notifications).toBe(true);
  });

  it("uses safe neutral speech settings", () => {
    expect(DEFAULT_VOICE_ASSISTANT_PREFERENCES.rate).toBeGreaterThanOrEqual(0.7);
    expect(DEFAULT_VOICE_ASSISTANT_PREFERENCES.rate).toBeLessThanOrEqual(1.4);
    expect(DEFAULT_VOICE_ASSISTANT_PREFERENCES.pitch).toBeGreaterThanOrEqual(0.7);
    expect(DEFAULT_VOICE_ASSISTANT_PREFERENCES.pitch).toBeLessThanOrEqual(1.3);
  });
});
