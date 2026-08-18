import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const baseGateway = vi.hoisted(() => ({ runChat: vi.fn() }));

vi.mock("../model-gateway.base", async () => {
  const actual = await vi.importActual<typeof import("../model-gateway.base")>("../model-gateway.base");
  return { ...actual, runChat: baseGateway.runChat };
});

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

  it("remembers the working provider for later tool rounds in the same conversation", async () => {
    baseGateway.runChat
      .mockRejectedValueOnce(new ProviderError("temporary outage", 503, true))
      .mockResolvedValueOnce({
        text: "first",
        toolCalls: [],
        usage: { input: 1, output: 1 },
        provider: "openai",
        model: "gpt-5-mini",
      })
      .mockResolvedValueOnce({
        text: "second",
        toolCalls: [],
        usage: { input: 1, output: 1 },
        provider: "openai",
        model: "gpt-5-mini",
      });

    const messages = [{ role: "user" as const, content: "Plan meals" }];
    await runChat(makeArgs(messages));
    await runChat(makeArgs(messages));

    expect(baseGateway.runChat).toHaveBeenCalledTimes(3);
    expect(baseGateway.runChat.mock.calls[2]?.[0]).toMatchObject({
      provider: "openai",
      model: "gpt-5-mini",
    });
  });

  it("never fails over a cancelled model call", async () => {
    baseGateway.runChat.mockRejectedValueOnce(new ProviderError("Run cancelled.", 499, false));
    const messages = [{ role: "user" as const, content: "Plan meals" }];

    await expect(runChat(makeArgs(messages))).rejects.toMatchObject({ status: 499 });
    expect(baseGateway.runChat).toHaveBeenCalledTimes(1);
  });
});
