import { afterEach, describe, expect, it } from "vitest";
import { githubAppConfigured, normaliseInstallationId } from "./github-app.server";

const originalAppId = process.env["GITHUB_APP_ID"];
const originalPrivateKey = process.env["GITHUB_APP_PRIVATE_KEY"];

afterEach(() => {
  if (originalAppId === undefined) delete process.env["GITHUB_APP_ID"];
  else process.env["GITHUB_APP_ID"] = originalAppId;
  if (originalPrivateKey === undefined) delete process.env["GITHUB_APP_PRIVATE_KEY"];
  else process.env["GITHUB_APP_PRIVATE_KEY"] = originalPrivateKey;
});

describe("GitHub App server foundation", () => {
  it("accepts only positive safe integer installation ids", () => {
    expect(normaliseInstallationId("12345")).toBe(12345);
    expect(normaliseInstallationId(9)).toBe(9);
    for (const value of [0, -1, 1.2, "abc", "1.5", Number.MAX_SAFE_INTEGER + 1, null, undefined]) {
      expect(() => normaliseInstallationId(value)).toThrow("Invalid GitHub App installation id");
    }
  });

  it("reports configuration only when both app credentials exist", () => {
    delete process.env["GITHUB_APP_ID"];
    delete process.env["GITHUB_APP_PRIVATE_KEY"];
    expect(githubAppConfigured()).toBe(false);
    process.env["GITHUB_APP_ID"] = "123";
    expect(githubAppConfigured()).toBe(false);
    process.env["GITHUB_APP_PRIVATE_KEY"] = "private-key";
    expect(githubAppConfigured()).toBe(true);
  });
});
