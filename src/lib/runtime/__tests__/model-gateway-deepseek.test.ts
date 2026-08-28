import { afterEach, describe, expect, it } from "vitest";
import { normaliseProvider, resolveModel } from "../model-gateway.server";
import { DEEPSEEK_V3_PROFILES } from "../deepseek-v3-profiles";

const originalKey = process.env["DEEPSEEK_API_KEY"];

afterEach(() => {
  if (originalKey === undefined) delete process.env["DEEPSEEK_API_KEY"];
  else process.env["DEEPSEEK_API_KEY"] = originalKey;
});

describe("DeepSeek V3 model gateway", () => {
  it("recognises hosted V3 aliases as the first-class DeepSeek provider", () => {
    expect(normaliseProvider("deepseek")).toBe("deepseek");
    expect(normaliseProvider("deepseek-v3")).toBe("deepseek");
    expect(normaliseProvider("deepseek-v3.1")).toBe("deepseek");
  });

  it("uses the hosted V3 chat model by default", () => {
    expect(resolveModel("deepseek", null)).toBe("deepseek-chat");
  });

  it("keeps source-derived deployment profiles bounded and truthful", () => {
    const v3 = DEEPSEEK_V3_PROFILES.find((profile) => profile.id === "671b");
    expect(v3).toMatchObject({ layers: 61, routedExperts: 256, activatedExperts: 8, dtype: "fp8", contextTokens: 128_000 });
    expect(DEEPSEEK_V3_PROFILES).toHaveLength(4);
  });
});
