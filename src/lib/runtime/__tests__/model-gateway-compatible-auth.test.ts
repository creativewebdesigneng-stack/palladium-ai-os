import { afterEach, describe, expect, it, vi } from "vitest";

import { runChat } from "../model-gateway.base";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

describe("OpenAI-compatible native authentication", () => {
  it("trims surrounding whitespace from the server-only compatible base URL and bearer key", async () => {
    process.env.OPENAI_COMPATIBLE_BASE_URL = "  https://native.example.test/v1/  \n";
    process.env.OPENAI_COMPATIBLE_API_KEY = "  native-secret-token\r\n";

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "OK" } }],
          usage: { prompt_tokens: 1, completion_tokens: 1 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await runChat({
      provider: "compatible",
      model: "qwen3:8b-q4_K_M",
      messages: [{ role: "user", content: "Reply with OK." }],
      maxTokens: 1,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://native.example.test/v1/chat/completions");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer native-secret-token");
  });
});
