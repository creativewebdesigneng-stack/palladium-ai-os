import { describe, expect, it } from "vitest";
import { validateWebhookUrl } from "../webhook-url";

describe("webhook endpoint validation", () => {
  it("accepts a public HTTPS endpoint and normalises it", () => {
    expect(validateWebhookUrl("https://Hooks.Example.com/events")).toBe(
      "https://hooks.example.com/events",
    );
  });

  it.each([
    "http://example.com/hook",
    "https://localhost/hook",
    "https://127.0.0.1/hook",
    "https://169.254.169.254/latest/meta-data",
    "https://10.0.0.2/hook",
    "https://[::1]/hook",
    "https://user:pass@example.com/hook",
  ])("rejects unsafe endpoint %s", (url) => {
    expect(() => validateWebhookUrl(url)).toThrow();
  });
});
