import { describe, expect, it } from "vitest";
import { boundedPersonalToolEvidence, PERSONAL_TOOL_EVIDENCE_CHARS } from "../personal-task-evidence";

describe("bounded personal-agent tool evidence", () => {
  it("keeps small real tool responses unchanged for approval continuity", () => {
    const value = { provider: "playwright", simulated: false, result: { ok: true, url: "https://httpbingo.org/html", text: "Herman Melville - Moby-Dick" } };
    const json = boundedPersonalToolEvidence(value);
    expect(json).toBe(JSON.stringify(value));
    expect(JSON.parse(json)).toEqual(value);
  });

  it("keeps long page evidence valid, bounded, and explicitly marked partial", () => {
    const value = { provider: "playwright", simulated: false, result: { ok: true, url: "https://httpbingo.org/html", text: "Moby Dick ".repeat(2100) } };
    const json = boundedPersonalToolEvidence(value);
    expect(json.length).toBeLessThanOrEqual(PERSONAL_TOOL_EVIDENCE_CHARS);
    const parsed = JSON.parse(json);
    expect(parsed).toMatchObject({
      truncated: true,
      provider: "playwright",
      simulated: false,
      result: { ok: true, url: "https://httpbingo.org/html" },
    });
    expect(parsed.original_characters).toBeGreaterThan(PERSONAL_TOOL_EVIDENCE_CHARS);
    expect(parsed.excerpt).toContain("Moby Dick");
  });

  it("always remains syntactically valid with escaped JSON and Unicode", () => {
    const json = boundedPersonalToolEvidence({ text: ('"\\\n🙂'.repeat(7000)) });
    expect(json.length).toBeLessThanOrEqual(PERSONAL_TOOL_EVIDENCE_CHARS);
    expect(JSON.parse(json)).toMatchObject({ truncated: true });
  });

  it("does not invent evidence from unserialisable output", () => {
    const value: Record<string, unknown> = {};
    value["self"] = value;
    const parsed = JSON.parse(boundedPersonalToolEvidence(value));
    expect(parsed.error).toContain("not JSON-serializable");
    expect(parsed).not.toHaveProperty("result");
  });

  it("limits saved provenance strings and accepts null tool output", () => {
    expect(JSON.parse(boundedPersonalToolEvidence(null))).toBe(null);
    const value = { provider: "x".repeat(800), simulated: false, result: { ok: false, url: "h".repeat(900), data: "z".repeat(20000) } };
    const parsed = JSON.parse(boundedPersonalToolEvidence(value));
    expect(parsed.provider.length).toBe(512);
    expect(parsed.result.url.length).toBe(512);
  });
});
