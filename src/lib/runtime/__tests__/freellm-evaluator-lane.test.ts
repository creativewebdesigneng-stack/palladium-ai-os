import { describe, expect, it } from "vitest";
import { FREELLMAPI_PROFILE } from "../freellmapi-profile";
import { listModelProviderDefinitions, isModelProviderConfigured } from "../model-providers.server";
import { parseFreeLlmRouteIdentity, resolveFreeLlmEvaluatorConfig } from "../../evals/freellm-evaluator.server";

describe("FreeLLM independent evaluator lane", () => {
  it("uses dedicated server-only environment variables rather than the native compatible lane", () => {
    expect(FREELLMAPI_PROFILE.palladiumProvider).toBe("freellm");
    expect(FREELLMAPI_PROFILE.baseUrlEnv).toBe("FREELLMAPI_BASE_URL");
    expect(FREELLMAPI_PROFILE.apiKeyEnv).toBe("FREELLMAPI_API_KEY");
    expect(FREELLMAPI_PROFILE.modelEnv).toBe("FREELLMAPI_MODEL");
  });

  it("resolves evaluator configuration independently from OPENAI_COMPATIBLE_BASE_URL", () => {
    const config = resolveFreeLlmEvaluatorConfig({
      OPENAI_COMPATIBLE_BASE_URL: "https://native.example/v1",
      OPENAI_COMPATIBLE_API_KEY: "native-secret",
      FREELLMAPI_BASE_URL: "https://judge.example/v1/",
      FREELLMAPI_API_KEY: "judge-secret",
      FREELLMAPI_MODEL: "judge-model",
    });
    expect(config).toEqual({
      configured: true,
      baseUrl: "https://judge.example/v1",
      apiKey: "judge-secret",
      model: "judge-model",
    });
  });

  it("parses the actual upstream provider/model route returned by FreeLLMAPI", () => {
    const headers = new Headers({
      "X-Routed-Via": "groq/openai/gpt-oss-20b",
      "X-Fallback-Attempts": "2",
    });
    expect(parseFreeLlmRouteIdentity(headers)).toEqual({
      routedVia: "groq/openai/gpt-oss-20b",
      routedProvider: "groq",
      routedModel: "openai/gpt-oss-20b",
      fallbackAttempts: 2,
    });
  });

  it("rejects missing or malformed routed identity evidence", () => {
    expect(() => parseFreeLlmRouteIdentity(new Headers())).toThrow(/X-Routed-Via/);
    expect(() => parseFreeLlmRouteIdentity(new Headers({ "X-Routed-Via": "invalid" }))).toThrow(/X-Routed-Via/);
  });

  it("surfaces the dedicated evaluator separately from local compatible inference", () => {
    const previousBase = process.env["FREELLMAPI_BASE_URL"];
    const previousModel = process.env["FREELLMAPI_MODEL"];
    process.env["FREELLMAPI_BASE_URL"] = "https://judge.example/v1";
    process.env["FREELLMAPI_MODEL"] = "judge-model";
    try {
      const providers = listModelProviderDefinitions();
      const freeLlm = providers.find((provider) => provider.id === "freellm");
      const compatible = providers.find((provider) => provider.id === "compatible");
      expect(freeLlm?.defaultModel).toBe("judge-model");
      expect(compatible?.id).toBe("compatible");
      expect(isModelProviderConfigured("freellm")).toBe(true);
    } finally {
      if (previousBase == null) delete process.env["FREELLMAPI_BASE_URL"];
      else process.env["FREELLMAPI_BASE_URL"] = previousBase;
      if (previousModel == null) delete process.env["FREELLMAPI_MODEL"];
      else process.env["FREELLMAPI_MODEL"] = previousModel;
    }
  });
});
