import { describe, expect, it } from "vitest";
import {
  COMPLEX_PERSONAL_TOOL_ROUNDS,
  DEFAULT_PERSONAL_TOOL_ROUNDS,
  MAX_PERSONAL_TOOL_CALLS,
  personalTaskToolRoundLimit,
  shouldPinBlackstarNativeTask,
} from "../personal-task-intelligence-policy";

describe("bounded Personal AI task intelligence", () => {
  it("keeps one-step runs cheap and allows explicit multi-step work to progress", () => {
    expect(personalTaskToolRoundLimit("Read this page", ["browser"])).toBe(DEFAULT_PERSONAL_TOOL_ROUNDS);
    expect(personalTaskToolRoundLimit("Navigate then read and compare sources", ["browser"])).toBe(COMPLEX_PERSONAL_TOOL_ROUNDS);
    expect(personalTaskToolRoundLimit("Read my calendar", ["calendar", "web_search"])).toBe(COMPLEX_PERSONAL_TOOL_ROUNDS);
    expect(personalTaskToolRoundLimit("Read my calendar", ["calendar", "calendar"])).toBe(DEFAULT_PERSONAL_TOOL_ROUNDS);
    expect(MAX_PERSONAL_TOOL_CALLS).toBe(12);
    expect(COMPLEX_PERSONAL_TOOL_ROUNDS).toBeLessThan(MAX_PERSONAL_TOOL_CALLS);
  });

  const env = {
    BLACKSTAR_NATIVE_PRIMARY: "true",
    OPENAI_COMPATIBLE_BASE_URL: "https://model.example.test/v1",
    BLACKSTAR_NATIVE_MODEL: "qwen3:8b-q4_K_M",
  };

  it("pins only the exact configured native-compatible identity", () => {
    expect(shouldPinBlackstarNativeTask("compatible", "qwen3:8b-q4_K_M", env)).toBe(true);
    expect(shouldPinBlackstarNativeTask("compatible", "different-model", env)).toBe(false);
    expect(shouldPinBlackstarNativeTask("groq", "qwen3:8b-q4_K_M", env)).toBe(false);
    expect(shouldPinBlackstarNativeTask("compatible", "qwen3:8b-q4_K_M", { ...env, BLACKSTAR_NATIVE_PRIMARY: "false" })).toBe(false);
    expect(shouldPinBlackstarNativeTask("compatible", "qwen3:8b-q4_K_M", { ...env, OPENAI_COMPATIBLE_BASE_URL: "" })).toBe(false);
    expect(shouldPinBlackstarNativeTask("compatible", "qwen3:8b-q4_K_M", { ...env, BLACKSTAR_NATIVE_MODEL: "" })).toBe(false);
  });
});
