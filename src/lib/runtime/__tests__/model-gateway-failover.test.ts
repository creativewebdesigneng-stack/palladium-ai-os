import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const baseGateway = vi.hoisted(() => ({ runChat: vi.fn() }));
const webAccess = vi.hoisted(() => ({ searchPublicWeb: vi.fn() }));

vi.mock("../model-gateway.base", async () => {
  const actual = await vi.importActual<typeof import("../model-gateway.base")>("../model-gateway.base");
  return { ...actual, runChat: baseGateway.runChat };
});

vi.mock("@/lib/ai/web-access.server", () => ({
  searchPublicWeb: webAccess.searchPublicWeb,
}));

import { ProviderError, runChat } from "../model-gateway.server";

const originalEnv = { ...process.env };

const makeArgs = (messages: Array<{ role: "user"; content: string }>) => ({
  provider: "groq" as const,
  model: "openai/gpt-oss-120b",
  messages,
  tools: [],
  temperature: null,
  maxTokens: 1200,
});

describe("model gateway provider failover", () => {
  beforeEach(() => {
    baseGateway.runChat.mockReset();
    webAccess.searchPublicWeb.mockReset();
    process.env["GROQ_API_KEY"] = "test-groq";
    process.env["OPENAI_API_KEY"] = "test-openai";
    delete process.env["ANTHROPIC_API_KEY"];
    delete process.env["LOVABLE_API_KEY"];
    delete process.env["OPENAI_COMPATIBLE_BASE_URL"];
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("fails over from Groq to OpenAI using the OpenAI default model", async () => {
    baseGateway.runChat
      .mockRejectedValueOnce(new ProviderError("rate limited", 429, true))
      .mockResolvedValueOnce({
        text: "Weekly diet plan ready",
        toolCalls: [],
        usage: { input: 10, output: 20 },
        provider: "openai",
        model: "gpt-5-mini",
      });

    const messages = [{ role: "user" as const, content: "Build me a weekly diet plan" }];
    const result = await runChat(makeArgs(messages));

    expect(result).toMatchObject({ provider: "openai", model: "gpt-5-mini" });
    expect(baseGateway.runChat).toHaveBeenCalledTimes(2);
    expect(baseGateway.runChat.mock.calls[0]?.[0]).toMatchObject({
      provider: "groq",
      model: "openai/gpt-oss-120b",
    });
    expect(baseGateway.runChat.mock.calls[1]?.[0]).toMatchObject({
      provider: "openai",
      model: "gpt-5-mini",
    });
  });

  it("falls back from Groq 120B to Groq 20B on retryable 5xx errors", async () => {
    baseGateway.runChat
      .mockRejectedValueOnce(new ProviderError("bad gateway", 502, true))
      .mockResolvedValueOnce({
        text: "Three London hotel options",
        toolCalls: [],
        usage: { input: 12, output: 25 },
        provider: "groq",
        model: "openai/gpt-oss-20b",
      });

    const messages = [{ role: "user" as const, content: "Find me three hotels in London" }];
    const result = await runChat(makeArgs(messages));

    expect(result).toMatchObject({ provider: "groq", model: "openai/gpt-oss-20b" });
    expect(baseGateway.runChat).toHaveBeenCalledTimes(2);
    expect(baseGateway.runChat.mock.calls[1]?.[0]).toMatchObject({
      provider: "groq",
      model: "openai/gpt-oss-20b",
    });
  });

  it("remembers the working provider and model for later tool rounds in the same conversation", async () => {
    baseGateway.runChat
      .mockRejectedValueOnce(new ProviderError("temporary outage", 502, true))
      .mockResolvedValueOnce({
        text: "first",
        toolCalls: [],
        usage: { input: 1, output: 1 },
        provider: "groq",
        model: "openai/gpt-oss-20b",
      })
      .mockResolvedValueOnce({
        text: "second",
        toolCalls: [],
        usage: { input: 1, output: 1 },
        provider: "groq",
        model: "openai/gpt-oss-20b",
      });

    const messages = [{ role: "user" as const, content: "Plan meals" }];
    await runChat(makeArgs(messages));
    await runChat(makeArgs(messages));

    expect(baseGateway.runChat).toHaveBeenCalledTimes(3);
    expect(baseGateway.runChat.mock.calls[2]?.[0]).toMatchObject({
      provider: "groq",
      model: "openai/gpt-oss-20b",
    });
  });

  it("rescues an authorised web-search task when every provider rejects tool calling", async () => {
    baseGateway.runChat
      .mockRejectedValueOnce(new ProviderError("tool schema rejected", 400, false))
      .mockRejectedValueOnce(new ProviderError("tool schema rejected", 400, false))
      .mockResolvedValueOnce({
        text: "Three live London hotel options",
        toolCalls: [],
        usage: { input: 50, output: 30 },
        provider: "groq",
        model: "openai/gpt-oss-120b",
      });
    webAccess.searchPublicWeb.mockResolvedValueOnce({
      query: "Find me three good hotels in London for next weekend.",
      results: [
        {
          title: "Example London Hotel",
          url: "https://example.com/london-hotel",
          snippet: "Central London hotel with current listing information.",
        },
      ],
    });

    const messages = [{
      role: "user" as const,
      content: "Find me three good hotels in London for next weekend.",
    }];
    const result = await runChat({
      ...makeArgs(messages),
      tools: [{
        name: "web_search",
        description: "Search the public web",
        parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
      }],
    });

    expect(result.text).toContain("London hotel");
    expect(webAccess.searchPublicWeb).toHaveBeenCalledWith(
      "Find me three good hotels in London for next weekend.",
      8,
      undefined,
    );
    expect(baseGateway.runChat).toHaveBeenCalledTimes(3);
    const rescueCall = baseGateway.runChat.mock.calls[2]?.[0];
    expect(rescueCall?.tools).toEqual([]);
    expect(rescueCall?.messages.at(-1)?.content).toContain("Example London Hotel");
    expect(rescueCall?.messages.at(-1)?.content).toContain("Do not invent prices");
  });

  it("does not perform server-side research rescue unless web_search was already authorised", async () => {
    baseGateway.runChat
      .mockRejectedValueOnce(new ProviderError("failed", 400, false))
      .mockRejectedValueOnce(new ProviderError("failed", 400, false));
    const messages = [{ role: "user" as const, content: "Find a hotel" }];

    await expect(runChat(makeArgs(messages))).rejects.toMatchObject({ status: 400 });
    expect(webAccess.searchPublicWeb).not.toHaveBeenCalled();
  });

  it("never fails over a cancelled model call", async () => {
    baseGateway.runChat.mockRejectedValueOnce(new ProviderError("Run cancelled.", 499, false));
    const messages = [{ role: "user" as const, content: "Plan meals" }];

    await expect(runChat(makeArgs(messages))).rejects.toMatchObject({ status: 499 });
    expect(baseGateway.runChat).toHaveBeenCalledTimes(1);
  });
});
