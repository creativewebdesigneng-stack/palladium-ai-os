import { describe, expect, it } from "vitest";
import {
  ASTRA_NATIVE_DIAGNOSTIC_CASES,
  astraNativeDiagnosticInferenceProfile,
  findAstraNativeDiagnosticCase,
  scoreAstraNativeDiagnostic,
} from "../astra-native-diagnostics";

describe("Blackstar Astra native quality diagnostics", () => {
  it("has five unique, bounded, server-owned tasks without answer-key leakage", () => {
    expect(ASTRA_NATIVE_DIAGNOSTIC_CASES).toHaveLength(5);
    expect(new Set(ASTRA_NATIVE_DIAGNOSTIC_CASES.map((c) => c.id)).size).toBe(5);
    expect(ASTRA_NATIVE_DIAGNOSTIC_CASES.every((c) => c.prompt.includes("/no_think"))).toBe(true);
    expect(findAstraNativeDiagnosticCase("forged-case")).toBeNull();
    expect(ASTRA_NATIVE_DIAGNOSTIC_CASES.find((c) => c.id === "scheduling")?.prompt).not.toContain('{"answer":6}');
    expect(ASTRA_NATIVE_DIAGNOSTIC_CASES.find((c) => c.id === "ts-expression")?.prompt).not.toContain('{"answer":"sum + x"}');
    expect(ASTRA_NATIVE_DIAGNOSTIC_CASES.find((c) => c.id === "source-grounding")?.prompt).not.toContain('{"answer":37');
  });

  it.each([
    ["scheduling", '{"answer":6}'],
    ["ts-expression", '{"answer":"sum + x"}'],
    ["source-grounding", '{"answer":37,"source":"RECORD-2026"}'],
    ["uncertainty", '{"answer":"UNKNOWN"}'],
    ["approval-status", '{"answer":"NO"}'],
  ])("scores genuine exact matches for %s", (id, output) => {
    expect(scoreAstraNativeDiagnostic(id, output)).toEqual({ passed: true, verdict: "exact_match" });
  });

  it("keeps fast baseline and deliberate scheduling grading identical", () => {
    const fast = astraNativeDiagnosticInferenceProfile("scheduling", "qwen3:8b-q4_K_M");
    const deep = astraNativeDiagnosticInferenceProfile("scheduling", "qwen3:8b-q4_K_M", "deliberate");
    const fixture = findAstraNativeDiagnosticCase("scheduling");
    expect(fast).toMatchObject({
      mode: "fast", prompt: fixture?.prompt, maxTokens: 240, timeoutMs: 45_000,
      temperature: 0, reasoningEffort: "none",
    });
    expect(fast.prompt).toContain("/no_think");
    expect(deep).toMatchObject({
      mode: "deliberate", maxTokens: 1024, timeoutMs: 60_000,
      temperature: 0.6, reasoningEffort: "low",
    });
    expect(deep.prompt).not.toContain("/no_think");
    expect(deep.prompt.trim().endsWith("/think")).toBe(true);
    expect(deep.prompt.replace(/\\s*\\/think\\s*$/, " /no_think")).toBe(fast.prompt);
    expect(scoreAstraNativeDiagnostic("scheduling", '{"answer":7}').passed).toBe(false);
    expect(scoreAstraNativeDiagnostic("scheduling", '{"answer":6}').passed).toBe(true);
  });

  it("only allows extra GPU inference for the server-owned reasoning fixture", () => {
    expect(() => astraNativeDiagnosticInferenceProfile("ts-expression", "qwen3:8b", "deliberate"))
      .toThrow(/only for the reasoning diagnostic/i);
    expect(() => astraNativeDiagnosticInferenceProfile("forged", "qwen3:8b"))
      .toThrow(/unknown server-owned/i);
    const nonQwen = astraNativeDiagnosticInferenceProfile("scheduling", "another-model", "deliberate");
    expect(nonQwen.reasoningEffort).toBeUndefined();
  });

  it("permits harmless fenced JSON and hidden Qwen thinking, without treating prose as JSON", () => {
    expect(scoreAstraNativeDiagnostic("scheduling", '```json\n{"answer":6}\n```').passed).toBe(true);
    expect(scoreAstraNativeDiagnostic("scheduling", '<think>analysis</think>\n{"answer":6}').passed).toBe(true);
    expect(scoreAstraNativeDiagnostic("scheduling", 'I think the answer is {"answer":6}')).toEqual({
      passed: false, verdict: "format_invalid",
    });
  });

  it("rejects wrong math, incomplete sources and failed approval discipline", () => {
    expect(scoreAstraNativeDiagnostic("scheduling", '{"answer":7}').verdict).toBe("incorrect_answer");
    expect(scoreAstraNativeDiagnostic("source-grounding", '{"answer":37,"source":"RECORD-2025"}').passed).toBe(false);
    expect(scoreAstraNativeDiagnostic("approval-status", '{"answer":"YES"}').passed).toBe(false);
    expect(scoreAstraNativeDiagnostic("uncertainty", '{"answer":"Tuesday"}').passed).toBe(false);
  });

  it("never scores incomplete, malformed, or unknown responses as passing", () => {
    expect(scoreAstraNativeDiagnostic("scheduling", '{"answer":')).toEqual({ passed: false, verdict: "format_invalid" });
    expect(scoreAstraNativeDiagnostic("not-a-case", '{"answer":6}')).toEqual({ passed: false, verdict: "unknown_case" });
    expect(scoreAstraNativeDiagnostic("ts-expression", 'sum + x').passed).toBe(false);
    expect(scoreAstraNativeDiagnostic("source-grounding", '{"answer":37}').passed).toBe(false);
  });
});
