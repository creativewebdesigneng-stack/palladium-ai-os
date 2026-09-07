import { describe, expect, it } from "vitest";
import {
  BLACKSTAR_NATIVE_VERIFICATION_MARKER,
  BLACKSTAR_NATIVE_VERIFICATION_MAX_TOKENS,
  BLACKSTAR_NATIVE_VERIFICATION_TIMEOUT_MS,
  isNativeVerificationMarker,
  nativeVerificationPrompt,
  normaliseNativeVerificationResponse,
  resolveNativeVerificationTarget,
} from "../native-runtime-verification";

describe("Blackstar native runtime verification", () => {
  it("requires native-primary, an OpenAI-compatible endpoint and an exact native model", () => {
    expect(resolveNativeVerificationTarget({
      BLACKSTAR_NATIVE_PRIMARY: "true",
      OPENAI_COMPATIBLE_BASE_URL: "https://blackstar-node.example/v1",
      BLACKSTAR_NATIVE_MODEL: "qwen3:8b-q4_K_M",
    })).toEqual({
      configured: true,
      provider: "compatible",
      model: "qwen3:8b-q4_K_M",
      reason: null,
    });
  });

  it("refuses verification when native-primary is not explicitly active", () => {
    const target = resolveNativeVerificationTarget({
      BLACKSTAR_NATIVE_PRIMARY: "false",
      OPENAI_COMPATIBLE_BASE_URL: "https://blackstar-node.example/v1",
      BLACKSTAR_NATIVE_MODEL: "qwen3:8b-q4_K_M",
    });
    expect(target.configured).toBe(false);
    expect(target.reason).toMatch(/native-primary/i);
  });

  it("uses a tiny deterministic no-think request with a bounded execution budget", () => {
    expect(nativeVerificationPrompt()).toBe(`/no_think\nReply with exactly ${BLACKSTAR_NATIVE_VERIFICATION_MARKER}`);
    expect(BLACKSTAR_NATIVE_VERIFICATION_MAX_TOKENS).toBeLessThanOrEqual(128);
    expect(BLACKSTAR_NATIVE_VERIFICATION_TIMEOUT_MS).toBe(60_000);
  });

  it("recognises the native challenge marker through harmless Qwen response formatting", () => {
    expect(isNativeVerificationMarker(BLACKSTAR_NATIVE_VERIFICATION_MARKER)).toBe(true);
    expect(isNativeVerificationMarker(`\"${BLACKSTAR_NATIVE_VERIFICATION_MARKER}\"`)).toBe(true);
    expect(isNativeVerificationMarker(`\`\`\`text\n${BLACKSTAR_NATIVE_VERIFICATION_MARKER}\n\`\`\``)).toBe(true);
    expect(isNativeVerificationMarker(`<think>internal reasoning</think>\n${BLACKSTAR_NATIVE_VERIFICATION_MARKER}`)).toBe(true);
    expect(isNativeVerificationMarker(`Sure — ${BLACKSTAR_NATIVE_VERIFICATION_MARKER}`)).toBe(true);
    expect(isNativeVerificationMarker(`${BLACKSTAR_NATIVE_VERIFICATION_MARKER}\nDone.`)).toBe(true);
    expect(normaliseNativeVerificationResponse(` <think>x</think> '${BLACKSTAR_NATIVE_VERIFICATION_MARKER}' `)).toBe(BLACKSTAR_NATIVE_VERIFICATION_MARKER);
  });

  it("still rejects missing, partial, altered, and case-changed markers", () => {
    expect(isNativeVerificationMarker("GPU ready")).toBe(false);
    expect(isNativeVerificationMarker("BLACKSTAR_GPU_O")).toBe(false);
    expect(isNativeVerificationMarker(`${BLACKSTAR_NATIVE_VERIFICATION_MARKER}_EXTRA`)).toBe(false);
    expect(isNativeVerificationMarker(BLACKSTAR_NATIVE_VERIFICATION_MARKER.toLowerCase())).toBe(false);
  });
});
