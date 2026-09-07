import { describe, expect, it } from "vitest";
import { chatBody } from "../model-gateway.base";
import { FREELLMAPI_PROFILE } from "../freellmapi-profile";

describe("FreeLLMAPI integration", () => {
  it("uses a dedicated evaluator lane instead of reusing Blackstar native compatible credentials", () => {
    expect(FREELLMAPI_PROFILE).toMatchObject({
      id: "freellm",
      protocol: "openai-compatible",
      palladiumProvider: "freellm",
      baseUrlEnv: "FREELLMAPI_BASE_URL",
      apiKeyEnv: "FREELLMAPI_API_KEY",
      modelEnv: "FREELLMAPI_MODEL",
      chatPath: "/chat/completions",
      deploymentPathSuffix: "/v1",
      routingOwner: "upstream",
    });
  });

  it("keeps the standard OpenAI chat-completions request shape including tools", () => {
    const body = chatBody(
      {
        provider: "compatible",
        model: "free-model",
        messages: [{ role: "user", content: "Inspect this request" }],
        tools: [
          {
            name: "lookup",
            description: "Look something up",
            parameters: {
              type: "object",
              properties: { query: { type: "string" } },
              required: ["query"],
            },
          },
        ],
      },
      false,
    );

    expect(body).toMatchObject({
      model: "free-model",
      stream: false,
      messages: [{ role: "user", content: "Inspect this request" }],
    });
    expect(body.tools?.[0]).toMatchObject({
      type: "function",
      function: { name: "lookup" },
    });
  });

  it("keeps FreeLLMAPI routing capabilities explicit on the independent evaluator transport", () => {
    expect(FREELLMAPI_PROFILE.capabilities).toEqual(
      expect.arrayContaining([
        "independent-evaluator-lane",
        "provider-pooling",
        "rate-limit-aware-routing",
        "fallback-routing",
        "streaming",
        "tool-calls",
      ]),
    );
  });
});
