import { afterEach, describe, expect, it, vi } from "vitest";
import { ProviderError } from "../model-gateway.base";
import {
  BLACKSTAR_GTX1080TI_QWEN3_LANE,
  clampAstraNativeOutputTokens,
  isGtx1080TiQwenLane,
  resolveAstraNativeLaneProfile,
} from "../blackstar-astra-native-lane";
import { classifyAstraNativeFailure } from "../blackstar-astra-native-errors";
import {
  buildAstraCodeRepairPrompt,
  buildAstraPlanningPrompt,
} from "../blackstar-astra-native-prompts";
import { extractAstraCodeArtifact, runAstraCodeRepairLoop } from "../blackstar-astra-code-repair";
import {
  clearAstraInferenceTelemetry,
  recentAstraInferenceTelemetry,
} from "../blackstar-astra-inference-telemetry";
import { executeAstraNativeLane } from "../blackstar-astra-native-lane.server";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  clearAstraInferenceTelemetry();
  vi.unstubAllGlobals();
});

describe("GTX 1080 Ti Qwen3 native lane", () => {
  it("selects Ollama and an 8192-token window for the 8B Q4 model", () => {
    process.env["BLACKSTAR_NATIVE_MODEL"] = "qwen3:8b-q4_K_M";
    process.env["BLACKSTAR_NATIVE_PRIMARY"] = "true";
    process.env["OPENAI_COMPATIBLE_BASE_URL"] = "http://127.0.0.1:11434/v1";
    const profile = resolveAstraNativeLaneProfile();
    expect(profile).toMatchObject({
      id: BLACKSTAR_GTX1080TI_QWEN3_LANE.id,
      model: "qwen3:8b-q4_K_M",
      runtime: "ollama",
      hardwareCompatible: true,
      numCtx: 8192,
    });
    expect(BLACKSTAR_GTX1080TI_QWEN3_LANE.gpu).toMatchObject({
      name: "NVIDIA GeForce GTX 1080 Ti",
      vramMib: 11264,
      computeCapability: "6.1",
    });
    expect(clampAstraNativeOutputTokens("chat", 8000).maxTokens).toBe(512);
    expect(clampAstraNativeOutputTokens("coding", 8000).clamped).toBe(true);
  });

  it("refuses the pinned vLLM image on Pascal unless the operator overrides the GPU", () => {
    process.env["BLACKSTAR_NATIVE_RUNTIME"] = "vllm";
    process.env["BLACKSTAR_NATIVE_MODEL"] = "qwen3:8b-q4_K_M";
    expect(resolveAstraNativeLaneProfile().hardwareCompatible).toBe(false);
    process.env["BLACKSTAR_NATIVE_GPU_OVERRIDE"] = "true";
    expect(resolveAstraNativeLaneProfile().hardwareCompatible).toBe(true);
    process.env["BLACKSTAR_NATIVE_LANE"] = "off";
    expect(isGtx1080TiQwenLane()).toBe(false);
  });

  it("keeps planning and repair prompts inside the local identity boundary", () => {
    const plan = buildAstraPlanningPrompt("Schedule the coolant inspection", "deep");
    expect(plan).toContain("qwen3:8b-q4_K_M");
    expect(plan).toContain("/think");
    expect(plan).toContain("never grants tools");
    const repair = buildAstraCodeRepairPrompt({
      task: "Fix the parser",
      previousCode: "export const value = 1",
      errors: ["Expected 2"],
    });
    expect(repair).toContain("not a diff");
    expect(repair).toContain("Expected 2");
  });

  it("repairs code from checker feedback and never evaluates the snippet", () => {
    const seen: string[] = [];
    const generate = vi.fn(async (prompt: string) => {
      seen.push(prompt);
      if (seen.length === 1)
        return "```ts\nexport const value = 1\n```\nExplanation: first attempt";
      return "```ts\nexport const value = 2\n```\nExplanation: repaired";
    });
    const check = vi.fn(async (artifact: { code: string }) => {
      expect(artifact.code).not.toMatch(/eval\(|Function\(/);
      return artifact.code.includes("value = 2")
        ? { ok: true as const }
        : { ok: false as const, errors: ["Expected 2"] };
    });
    return runAstraCodeRepairLoop({ task: "Return 2", generate, check }).then((result) => {
      expect(result).toMatchObject({ ok: true, attempts: 2, stopped: "passed" });
      expect(check).toHaveBeenCalledTimes(2);
      expect(seen[1]).toContain("Expected 2");
    });
  });

  it("stops after the attempt budget when no fenced code is returned", async () => {
    const result = await runAstraCodeRepairLoop({
      task: "Write a function",
      maxAttempts: 2,
      generate: async () => "I cannot produce a fence.",
      check: async () => ({ ok: true }),
    });
    expect(result).toMatchObject({ ok: false, stopped: "no_code", attempts: 2, artifact: null });
    expect(extractAstraCodeArtifact("no fence here")).toBeNull();
  });

  it("falls back when the local model is missing and records identity telemetry without the prompt", async () => {
    process.env["BLACKSTAR_NATIVE_PRIMARY"] = "true";
    process.env["OPENAI_COMPATIBLE_BASE_URL"] = "http://127.0.0.1:11434/v1";
    process.env["BLACKSTAR_NATIVE_MODEL"] = "qwen3:8b-q4_K_M";
    process.env["OPENAI_API_KEY"] = "synthetic-openai";
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ data: [{ id: "other-model" }] }), { status: 200 }),
    );
    const invoke = vi.fn(async (args: { provider: string }) => {
      expect(args.provider).not.toBe("compatible");
      return {
        text: "cloud answer",
        toolCalls: [],
        usage: { input: 3, output: 4 },
        provider: "openai" as const,
        model: "gpt-5-mini",
      };
    });
    const result = await executeAstraNativeLane({
      provider: "compatible",
      model: "qwen3:8b-q4_K_M",
      messages: [{ role: "user", content: "secret prompt about the coolant valve" }],
      invoke,
      fetchImpl: fetchImpl as typeof fetch,
      now: () => 1_000,
    });
    expect(result.provider).toBe("openai");
    expect(result.astraTelemetry).toMatchObject({
      fallback: true,
      identity_match: false,
      error_code: "model_missing",
      requested_model: "qwen3:8b-q4_K_M",
      prompt_chars: expect.any(Number),
    });
    expect(JSON.stringify(result.astraTelemetry)).not.toContain("secret prompt");
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(recentAstraInferenceTelemetry()).toHaveLength(1);
  });

  it("retries one empty local reply and then keeps a visible local answer", async () => {
    process.env["BLACKSTAR_NATIVE_PRIMARY"] = "true";
    process.env["OPENAI_COMPATIBLE_BASE_URL"] = "http://127.0.0.1:11434/v1";
    process.env["BLACKSTAR_NATIVE_MODEL"] = "qwen3:8b-q4_K_M";
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ models: [{ name: "qwen3:8b-q4_K_M" }] }), { status: 200 }),
      ),
    );
    const invoke = vi
      .fn()
      .mockResolvedValueOnce({
        text: "<think>hidden</think>",
        toolCalls: [],
        usage: { input: 1, output: 1 },
        provider: "compatible",
        model: "qwen3:8b-q4_K_M",
      })
      .mockResolvedValueOnce({
        text: "ready",
        toolCalls: [],
        usage: { input: 2, output: 2 },
        provider: "compatible",
        model: "qwen3:8b-q4_K_M",
      });
    const result = await executeAstraNativeLane({
      provider: "compatible",
      model: "qwen3:8b-q4_K_M",
      messages: [{ role: "user", content: "Reply ready" }],
      invoke,
    });
    expect(result.text).toBe("ready");
    expect(result.astraTelemetry.identity_match).toBe(true);
    expect(result.astraTelemetry.fallback).toBe(false);
    expect(invoke).toHaveBeenCalledTimes(2);
    const sent = invoke.mock.calls[0]?.[0].messages.at(-1).content as string;
    expect(sent).toContain("/no_think");
  });

  it("does not fall back after cancellation", async () => {
    process.env["BLACKSTAR_NATIVE_PRIMARY"] = "true";
    process.env["OPENAI_COMPATIBLE_BASE_URL"] = "http://127.0.0.1:11434/v1";
    process.env["BLACKSTAR_NATIVE_MODEL"] = "qwen3:8b-q4_K_M";
    process.env["GROQ_API_KEY"] = "synthetic-groq";
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ data: [{ id: "qwen3:8b-q4_K_M" }] }), { status: 200 }),
    );
    const invoke = vi.fn(async () => {
      throw new ProviderError("cancelled", 499, false);
    });
    await expect(
      executeAstraNativeLane({
        provider: "compatible",
        model: "qwen3:8b-q4_K_M",
        messages: [{ role: "user", content: "Stop" }],
        invoke,
        fetchImpl: fetchImpl as typeof fetch,
      }),
    ).rejects.toMatchObject({ status: 499 });
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(classifyAstraNativeFailure(new ProviderError("quota", 402, false)).action).toBe(
      "fallback",
    );
  });
});
