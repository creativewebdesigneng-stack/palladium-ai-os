import { afterEach, describe, expect, it, vi } from "vitest";

import { runChat } from "../model-gateway.base";

const originalBaseUrl = process.env["OPENAI_COMPATIBLE_BASE_URL"];
const originalApiKey = process.env["OPENAI_COMPATIBLE_API_KEY"];

afterEach(() => {
  if (originalBaseUrl === undefined) delete process.env["OPENAI_COMPATIBLE_BASE_URL"];
  else process.env["OPENAI_COMPATIBLE_BASE_URL"] = originalBaseUrl;

  if (originalApiKey === undefined) delete process.env["OPENAI_COMPATIBLE_API_KEY"];
  else process.env["OPENAI_COMPATIBLE_API_KEY"] = originalApiKey;

  vi.restoreAllMocks();
});

describe("OpenAI-compatible native authentication", () => {
  it("trims surrounding whitespace from the server-only compatible base URL and bearer key", async () => {
    process.env["OPENAI_COMPATIBLE_BASE_URL"] = "  https://native.example.test/v1/  \n";
    process.env["OPENAI_COMPATIBLE_API_KEY"] = "  native-secret-token\r\n";

    let capturedUrl = "";
    let capturedHeaders = new Headers();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      capturedUrl = String(input);
      capturedHeaders = new Headers(init?.headers);
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "OK" } }],
          usage: { prompt_tokens: 1, completion_tokens: 1 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    await runChat({
      provider: "compatible",
      model: "qwen3:8b-q4_K_M",
      messages: [{ role: "user", content: "Reply with OK." }],
      maxTokens: 1,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(capturedUrl).toBe("https://native.example.test/v1/chat/completions");
    expect(capturedHeaders.get("authorization")).toBe("Bearer native-secret-token");
  });
});
