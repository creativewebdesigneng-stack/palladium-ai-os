import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const iosBridge = readFileSync(
  new URL("../../../native/mobile-intelligence/ios/BlackstarMobileBridge.swift", import.meta.url),
  "utf8",
);
const androidBridge = readFileSync(
  new URL("../../../native/mobile-intelligence/android/BlackstarMobileBridge.kt", import.meta.url),
  "utf8",
);
const iosIntent = readFileSync(
  new URL("../../../native/mobile-intelligence/ios/BlackstarMobileIntent.swift", import.meta.url),
  "utf8",
);
const androidGate = readFileSync(
  new URL(
    "../../../native/mobile-intelligence/android/BlackstarAppFunctionBoundary.kt",
    import.meta.url,
  ),
  "utf8",
);

const reportFields = [
  "platform",
  "osVersion",
  "nativeIntelligenceAvailable",
  "nativeProvider",
  "capabilities",
  "appActionsAvailable",
];

describe("native mobile intelligence bridge contract", () => {
  it("reports the same capability fields from iOS and Android", () => {
    for (const field of reportFields) {
      expect(iosBridge).toContain(field);
      expect(androidBridge).toContain(field);
    }
    expect(iosBridge).toContain("apple-foundation-models");
    expect(androidBridge).toContain("gemini-nano");
  });

  it("keeps native app actions from executing an unapproved side effect", () => {
    expect(iosIntent).toContain("must not execute an unapproved side effect");
    expect(iosIntent).toContain("#if canImport(AppIntents)");
    expect(androidGate).toContain("ApprovalRequired");
    expect(androidGate).not.toContain("http");
  });
});
