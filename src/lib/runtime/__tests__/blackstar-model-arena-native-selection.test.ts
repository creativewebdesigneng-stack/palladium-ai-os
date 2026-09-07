import { afterEach, describe, expect, it } from "vitest";
import { listModelProviderDefinitions } from "../model-providers.server";

const original = {
  nativePrimary: process.env["BLACKSTAR_NATIVE_PRIMARY"],
  nativeModel: process.env["BLACKSTAR_NATIVE_MODEL"],
  compatibleBaseUrl: process.env["OPENAI_COMPATIBLE_BASE_URL"],
};

afterEach(() => {
  if (original.nativePrimary === undefined) delete process.env["BLACKSTAR_NATIVE_PRIMARY"];
  else process.env["BLACKSTAR_NATIVE_PRIMARY"] = original.nativePrimary;
  if (original.nativeModel === undefined) delete process.env["BLACKSTAR_NATIVE_MODEL"];
  else process.env["BLACKSTAR_NATIVE_MODEL"] = original.nativeModel;
  if (original.compatibleBaseUrl === undefined) delete process.env["OPENAI_COMPATIBLE_BASE_URL"];
  else process.env["OPENAI_COMPATIBLE_BASE_URL"] = original.compatibleBaseUrl;
});

describe("Blackstar Model Arena native selection", () => {
  it("surfaces the configured Blackstar native model as the compatible provider default", () => {
    process.env["BLACKSTAR_NATIVE_PRIMARY"] = "true";
    process.env["BLACKSTAR_NATIVE_MODEL"] = "qwen3:8b-q4_K_M";
    process.env["OPENAI_COMPATIBLE_BASE_URL"] = "https://blackstar-node.example/v1";

    const compatible = listModelProviderDefinitions().find((provider) => provider.id === "compatible");

    expect(compatible?.defaultModel).toBe("qwen3:8b-q4_K_M");
  });

  it("does not leak a native model into a compatible runtime unless native-primary is active", () => {
    process.env["BLACKSTAR_NATIVE_PRIMARY"] = "false";
    process.env["BLACKSTAR_NATIVE_MODEL"] = "qwen3:8b-q4_K_M";
    process.env["OPENAI_COMPATIBLE_BASE_URL"] = "https://blackstar-node.example/v1";

    const compatible = listModelProviderDefinitions().find((provider) => provider.id === "compatible");

    expect(compatible?.defaultModel).toBe("local-model");
  });
});
