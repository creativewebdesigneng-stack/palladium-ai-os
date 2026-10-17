import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runGeminiNative, streamGeminiNative } from "../gemini-provider.server";
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


describe("Gemini signed tool continuation", () => {
  const parts = [
    { text: "Checking both values.", thoughtSignature: "opaque-text-signature" },
    { functionCall: { name: "calculator", args: { expression: "37 * 19 + 5" } }, thoughtSignature: "opaque-call-signature" },
    { functionCall: { name: "current_time", args: {} } },
  ];
  const args = { provider: "gemini" as const, model: "gemini-3.6-flash", messages: [{ role: "user" as const, content: "Check values" }] };
  const response = (value: unknown) => new Response(JSON.stringify({ candidates: [{ content: { parts: value } }] }), { status: 200 });

  it.each([false, true])("round-trips ordered signed parts through native calls (stream=%s)", async stream => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response(parts)).mockResolvedValueOnce(response([{ text: "Approval required." }]));
    vi.stubGlobal("fetch", fetchMock);
    let first;
    if (stream) {
      for await (const event of streamGeminiNative(args)) if (event.type === "done") first = event.result;
    } else first = await runGeminiNative(args);
    expect(first?.geminiContinuation).toEqual({ model: args.model, parts });
    await runGeminiNative({ ...args, messages: [
      ...args.messages,
      { role: "assistant", content: first!.text, tool_calls: first!.toolCalls, geminiContinuation: first!.geminiContinuation! },
      { role: "tool", tool_call_id: first!.toolCalls[0]!.id, content: JSON.stringify({ requires_approval: true }) },
      { role: "tool", tool_call_id: first!.toolCalls[1]!.id, content: JSON.stringify({ requires_approval: true }) },
    ] });
    const body = JSON.parse(String(fetchMock.mock.calls[1]![1].body));
    expect(body.contents[1]).toEqual({ role: "model", parts });
    expect(body.contents[2].parts).toHaveLength(2);
    expect(body.contents[2].parts[0].functionResponse).toEqual({ name: "calculator", response: { requires_approval: true } });
    expect(body.contents).toHaveLength(3);
  });

  it("never exposes provider thought text in the result or continuation", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([
      { thought: true, text: "provider-private-thought", thoughtSignature: "private-part" }, ...parts,
    ])));
    const result = await runGeminiNative(args);
    expect(result.text).toBe("Checking both values.");
    expect(JSON.stringify(result)).not.toContain("provider-private-thought");
    expect(result.geminiContinuation?.parts).toEqual(parts);
  });

  it("never forwards a continuation to another model", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response([{ text: "Done" }]));
    vi.stubGlobal("fetch", fetchMock);
    await runGeminiNative({ ...args, messages: [{ role: "assistant", content: "Safe public text", geminiContinuation: { model: "other-model", parts } }] });
    const body = JSON.parse(String(fetchMock.mock.calls[0]![1].body));
    expect(body.contents).toEqual([{ role: "model", parts: [{ text: "Safe public text" }] }]);
    expect(JSON.stringify(body)).not.toContain("opaque-call-signature");
  });
});
