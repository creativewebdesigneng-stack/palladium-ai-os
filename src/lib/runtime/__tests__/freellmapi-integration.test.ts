import { describe, expect, it } from "vitest";
import { chatBody } from "../model-gateway.base";
import { FREELLMAPI_PROFILE } from "../freellmapi-profile";

describe("FreeLLMAPI integration", () => {
  it("reuses PalladiumAI's OpenAI-compatible provider lane", () => {
    expect(FREELLMAPI_PROFILE).toMatchObject({
      id: "freellmapi",
      protocol: "openai-compatible",
      palladiumProvider: "compatible",
      baseUrlEnv: "OPENAI_COMPATIBLE_BASE_URL",
      apiKeyEnv: "OPENAI_COMPATIBLE_API_KEY",
      chatPath: "/chat/completions",
      deploymentPathSuffix: "/v1",
      routingOwner: "upstream",
    });
  });

  it("uses the existing OpenAI chat-completions request shape including tools", () => {
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

  it("keeps FreeLLMAPI routing capabilities explicit without adding a second Palladium gateway", () => {
    expect(FREELLMAPI_PROFILE.capabilities).toEqual(
      expect.arrayContaining([
        "provider-pooling",
        "rate-limit-aware-routing",
        "fallback-routing",
        "streaming",
        "tool-calls",
      ]),
    );
  });
});
