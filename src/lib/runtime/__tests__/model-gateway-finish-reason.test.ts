import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runChat, streamChat } from "../model-gateway.base";

const args = { provider: "compatible" as const, model: "qwen3:8b-q4_K_M", messages: [{ role: "user" as const, content: "Return code. /no_think" }] };

beforeEach(() => {
  vi.stubEnv("OPENAI_COMPATIBLE_BASE_URL", "https://native.example.test/v1");
  vi.stubEnv("OPENAI_COMPATIBLE_API_KEY", "test-only");
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe("safe upstream finish evidence", () => {
  it("retains a length stop and usage even with no visible text", async () => {
    const frames = [
      { choices: [{ delta: { reasoning_content: "PRIVATE_REASONING_SENTINEL" } }] },
      { choices: [{ delta: {}, finish_reason: "length" }] },
      { choices: [], usage: { prompt_tokens: 91, completion_tokens: 1536 } },
    ];
    const encoded = new TextEncoder().encode(frames.map(frame => `data: ${JSON.stringify(frame)}\n\n`).join("") + "data: [DONE]\n\n");
    const response = new ReadableStream<Uint8Array>({ start(controller) {
      // Split within a JSON frame to exercise normal transport chunking.
      controller.enqueue(encoded.slice(0, 37)); controller.enqueue(encoded.slice(37)); controller.close();
    } });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(response));
    const events = []; for await (const event of streamChat(args)) events.push(event);
    expect(events).toEqual([{ type: "done", result: { text: "", toolCalls: [], usage: { input: 91, output: 1536 }, provider: args.provider, model: args.model, finishReason: "length" } }]);
    expect(JSON.stringify(events)).not.toContain("PRIVATE_REASONING_SENTINEL");
  });

  it.each(["stop", "length", "tool_calls"])("retains the non-streaming protocol reason %s", async (finish_reason) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "OK" }, finish_reason }], usage: { prompt_tokens: 2, completion_tokens: 1 } })));
    expect(await runChat(args)).toMatchObject({ text: "OK", finishReason: finish_reason });
  });

  it("omits unknown upstream strings instead of treating them as safe telemetry", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "OK" }, finish_reason: "PRIVATE_UPSTREAM_SENTINEL" }] })));
    const result = await runChat(args);
    expect(result).not.toHaveProperty("finishReason");
    expect(JSON.stringify(result)).not.toContain("PRIVATE_UPSTREAM_SENTINEL");
  });
});
