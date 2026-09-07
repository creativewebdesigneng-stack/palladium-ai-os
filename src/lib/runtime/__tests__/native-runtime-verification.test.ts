import { describe, expect, it } from "vitest";
import {
  BLACKSTAR_NATIVE_VERIFICATION_MARKER,
  BLACKSTAR_NATIVE_VERIFICATION_MAX_TOKENS,
  BLACKSTAR_NATIVE_VERIFICATION_TIMEOUT_MS,
  nativeVerificationPrompt,
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
    expect(nativeVerificationPrompt()).toBe(`Reply with exactly ${BLACKSTAR_NATIVE_VERIFICATION_MARKER} /no_think`);
    expect(BLACKSTAR_NATIVE_VERIFICATION_MAX_TOKENS).toBeLessThanOrEqual(128);
    expect(BLACKSTAR_NATIVE_VERIFICATION_TIMEOUT_MS).toBe(60_000);
  });
});
