import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  baseRunChat: vi.fn(),
  geminiRunChat: vi.fn(),
}));

vi.mock("../model-gateway.base", () => {
  class ProviderError extends Error {
    constructor(
      message: string,
      readonly status: number,
      readonly retryable: boolean,
    ) {
      super(message);
    }
  }

  return {
    ProviderError,
    resolveModel: (_provider: string, model?: string | null) => model?.trim() || "default-model",
    runChat: mocks.baseRunChat,
    streamChat: vi.fn(),
  };
});

vi.mock("../gemini-provider.server", () => ({
  runGeminiNative: mocks.geminiRunChat,
  streamGeminiNative: vi.fn(),
}));

vi.mock("@/lib/ai/web-access.server", () => ({
  searchPublicWeb: vi.fn(),
}));

vi.mock("../run-context-journal.server", () => ({
  compactRunContextInPlace: vi.fn(),
}));

vi.mock("../blackstar-astra-context-policy", () => ({
  blackstarAstraContextCompactionOptions: vi.fn(() => ({})),
}));

import { runChatPinned } from "../model-gateway.server";

describe("runChatPinned", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env["OPENAI_COMPATIBLE_BASE_URL"];
    delete process.env["GROQ_API_KEY"];
  });

  it("uses exactly the requested provider and model", async () => {
    mocks.baseRunChat.mockResolvedValue({
      text: "ok",
      toolCalls: [],
      usage: { input: 1, output: 1 },
      provider: "openai",
      model: "gpt-5-mini",
    });

    const result = await runChatPinned({
      provider: "openai",
      model: "gpt-5-mini",
      messages: [{ role: "user", content: "score this" }],
    });

    expect(result.provider).toBe("openai");
    expect(result.model).toBe("gpt-5-mini");
    expect(mocks.baseRunChat).toHaveBeenCalledTimes(1);
    expect(mocks.baseRunChat).toHaveBeenCalledWith(expect.objectContaining({
      provider: "openai",
      model: "gpt-5-mini",
    }));
    expect(mocks.geminiRunChat).not.toHaveBeenCalled();
  });

  it("does not cross-provider fail over when the pinned provider fails", async () => {
    mocks.baseRunChat.mockRejectedValue(new Error("pinned provider unavailable"));
    process.env["GROQ_API_KEY"] = "configured-for-test";

    await expect(runChatPinned({
      provider: "openai",
      model: "gpt-5-mini",
      messages: [{ role: "user", content: "score this" }],
    })).rejects.toThrow("pinned provider unavailable");

    expect(mocks.baseRunChat).toHaveBeenCalledTimes(1);
    expect(mocks.baseRunChat).toHaveBeenCalledWith(expect.objectContaining({
      provider: "openai",
      model: "gpt-5-mini",
    }));
    expect(mocks.geminiRunChat).not.toHaveBeenCalled();
  });
});