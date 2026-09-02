import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runGeminiNative } from "../gemini-provider.server";
import { normaliseProvider } from "../model-gateway.base";
import { resolveModel } from "../model-gateway.server";

beforeEach(() => {
  vi.stubEnv("GEMINI_API_KEY", "test-gemini-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Gemini provider", () => {
  it("normalises Google aliases and pins the proven production model", () => {
    expect(normaliseProvider("gemini")).toBe("gemini");
    expect(normaliseProvider("google")).toBe("gemini");
    expect(normaliseProvider("google-gemini")).toBe("gemini");
    expect(resolveModel("gemini", null)).toBe("gemini-3.6-flash");
    expect(resolveModel("gemini", "gemini-3.7-flash")).toBe("gemini-3.6-flash");
  });

  it("calls the native Gemini endpoint and parses text, tools, and usage", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  { text: "I will check that." },
                  { functionCall: { name: "lookup_order", args: { order_id: "123" } } },
                ],
              },
            },
          ],
          usageMetadata: { promptTokenCount: 7, candidatesTokenCount: 4 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await runGeminiNative({
      provider: "gemini",
      model: "gemini-3.6-flash",
      messages: [
        { role: "system", content: "Be concise." },
        { role: "user", content: "Check order 123." },
      ],
      tools: [
        {
          name: "lookup_order",
          description: "Look up an order",
          parameters: {
            type: "object",
            properties: { order_id: { type: "string" } },
            required: ["order_id"],
          },
        },
      ],
      maxTokens: 32,
    });

    expect(result).toMatchObject({
      text: "I will check that.",
      provider: "gemini",
      model: "gemini-3.6-flash",
      usage: { input: 7, output: 4 },
    });
    expect(result.toolCalls).toEqual([
      {
        id: "gemini_call_1_lookup_order",
        name: "lookup_order",
        arguments: { order_id: "123" },
      },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
    );
    expect(init.headers).toMatchObject({
      "x-goog-api-key": "test-gemini-key",
      "Content-Type": "application/json",
    });
    const body = JSON.parse(String(init.body));
    expect(body.systemInstruction).toEqual({ parts: [{ text: "Be concise." }] });
    expect(body.contents).toEqual([{ role: "user", parts: [{ text: "Check order 123." }] }]);
    expect(body.tools[0].functionDeclarations[0].name).toBe("lookup_order");
    expect(body.generationConfig.maxOutputTokens).toBe(32);
  });

  it("sends tool results back using Gemini function responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: "Order is shipped." }] } }],
          usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 3 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await runGeminiNative({
      provider: "gemini",
      model: "gemini-3.6-flash",
      messages: [
        { role: "user", content: "Check order 123." },
        {
          role: "assistant",
          content: "",
          tool_calls: [
            { id: "call_1", name: "lookup_order", arguments: { order_id: "123" } },
          ],
        },
        {
          role: "tool",
          tool_call_id: "call_1",
          content: JSON.stringify({ status: "shipped" }),
        },
      ],
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body.contents[1]).toEqual({
      role: "model",
      parts: [{ functionCall: { name: "lookup_order", args: { order_id: "123" } } }],
    });
    expect(body.contents[2]).toEqual({
      role: "user",
      parts: [
        {
          functionResponse: {
            name: "lookup_order",
            response: { status: "shipped" },
          },
        },
      ],
    });
  });
});
