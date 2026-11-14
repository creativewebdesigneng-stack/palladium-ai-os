import { afterEach, describe, expect, it, vi } from "vitest";

const baseGateway = vi.hoisted(() => ({ runChat: vi.fn() }));

vi.mock("../model-gateway.base", async () => {
  const actual =
    await vi.importActual<typeof import("../model-gateway.base")>("../model-gateway.base");
  return { ...actual, runChat: baseGateway.runChat };
});

vi.mock("@/lib/ai/web-access.server", () => ({ searchPublicWeb: vi.fn() }));

import { runChat } from "../model-gateway.server";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllGlobals();
  baseGateway.runChat.mockReset();
});

describe("native lane routing through the model gateway", () => {
  it("sends the Qwen3 identity to the local runtime before any configured provider", async () => {
    process.env["BLACKSTAR_NATIVE_PRIMARY"] = "true";
    process.env["OPENAI_COMPATIBLE_BASE_URL"] = "http://127.0.0.1:11434/v1";
    process.env["BLACKSTAR_NATIVE_MODEL"] = "qwen3:8b-q4_K_M";
    process.env["OPENAI_API_KEY"] = "synthetic-openai";
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ data: [{ id: "qwen3:8b-q4_K_M" }] }), { status: 200 }),
      ),
    );
    baseGateway.runChat.mockResolvedValue({
      text: "local answer",
      toolCalls: [],
      usage: { input: 5, output: 6 },
      provider: "compatible",
      model: "qwen3:8b-q4_K_M",
    });
    const result = await runChat({
      provider: "compatible",
      model: "qwen3:8b-q4_K_M",
      messages: [{ role: "user", content: "Say ready" }],
      maxTokens: 4000,
    });
    expect(result.model).toBe("qwen3:8b-q4_K_M");
    expect(baseGateway.runChat).toHaveBeenCalledTimes(1);
    const call = baseGateway.runChat.mock.calls[0]?.[0];
    expect(call.provider).toBe("compatible");
    expect(call.maxTokens).toBe(512);
    expect(call.messages.at(-1).content).toContain("/no_think");
    expect(call.messages[0].content).toContain("qwen3:8b-q4_K_M");
  });
});
