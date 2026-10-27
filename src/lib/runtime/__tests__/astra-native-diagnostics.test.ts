import { describe, expect, it } from "vitest";
import {
  ASTRA_NATIVE_DIAGNOSTIC_CASES,
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
