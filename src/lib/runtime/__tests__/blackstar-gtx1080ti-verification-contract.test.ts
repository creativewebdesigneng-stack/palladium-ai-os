import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BLACKSTAR_NATIVE_VERIFICATION_MARKER } from "../native-runtime-verification";

const root = process.cwd();
const windows = readFileSync(
  resolve(root, "astra-serving/windows/verify-qwen3-gtx1080ti.ps1"),
  "utf8",
);
const linux = readFileSync(resolve(root, "astra-serving/verify-qwen3-gtx1080ti.sh"), "utf8");
const doc = readFileSync(resolve(root, "docs/astra/gtx-1080ti-qwen3-native-lane.md"), "utf8");

describe("GTX 1080 Ti owner verification", () => {
  it("checks localhost Qwen3 identity without pulling weights or calling a paid API", () => {
    for (const script of [windows, linux]) {
      expect(script).toContain("qwen3:8b-q4_K_M");
      expect(script).toContain("127.0.0.1");
      expect(script).toContain("BLACKSTAR_GPU_OK");
      expect(script).toContain("OLLAMA_CONTEXT_LENGTH=8192");
      expect(script).toContain("does not pull a model");
      expect(script).not.toMatch(/sk-[A-Za-z0-9]/);
      expect(script).not.toContain("api.openai.com");
      expect(script).not.toContain("generativelanguage");
    }
    expect(windows).toContain("Do not expose port 11434");
    expect(linux).toContain("Do not expose port 11434");
    expect(doc).toContain("compute capability 6.1");
    expect(doc).toContain("BLACKSTAR_NATIVE_PRIMARY=true");
    expect(doc).toContain(BLACKSTAR_NATIVE_VERIFICATION_MARKER);
  });
});
