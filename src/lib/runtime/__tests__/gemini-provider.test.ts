import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normaliseProvider, resolveModel, runChat } from "../model-gateway.base";

beforeEach(() => {
  vi.stubEnv("GEMINI_API_KEY", "test-gemini-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Gemini provider", () => {
  it("normalises Google aliases and uses the Gemini free-tier agent model by default", () => {
    expect(normaliseProvider("gemini")).toBe("gemini");
    expect(normaliseProvider("google")).toBe("gemini");
    expect(normaliseProvider("google-gemini")).toBe("gemini");
    expect(resolveModel("gemini", null)).toBe("gemini-3.7-flash");
  });

  it("calls Google's Gemini OpenAI-compatible endpoint with server-side credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "OK", tool_calls: [] } }],
          usage: { prompt_tokens: 3, completion_tokens: 1 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await runChat({
      provider: "gemini",
      model: "gemini-3.7-flash",
      messages: [{ role: "user", content: "Reply OK." }],
      maxTokens: 8,
    });

    expect(result).toMatchObject({
      text: "OK",
      provider: "gemini",
      model: "gemini-3.7-flash",
      usage: { input: 3, output: 1 },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer test-gemini-key",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(init.body))).toMatchObject({
      model: "gemini-3.7-flash",
      messages: [{ role: "user", content: "Reply OK." }],
      max_tokens: 8,
    });
  });
});
