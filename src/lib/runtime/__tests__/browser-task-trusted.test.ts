import { describe, expect, it, vi } from "vitest";
import type { BrowserTool } from "@/lib/mission/browser-agent";
import { runBoundedBrowserTask } from "../browser-task.server";

function browser(items: unknown[]) {
  const typed: Array<[string, string]> = [];
  const clicked: string[] = [];
  const tool: BrowserTool = {
    provider: "test",
    kind: "production",
    steps: () => [],
    navigate: async (url) => ({ ok: true, url, simulated: false }),
    search: async () => [],
    click: async (selector) => { clicked.push(selector); return { ok: true, simulated: false }; },
    type: async (selector, value) => { typed.push([selector, value]); return { ok: true, simulated: false }; },
    scroll: async () => ({ ok: true, simulated: false }),
    extract: async (url) => ({ url, text: "Login", items, simulated: false }),
    screenshot: async () => ({ ok: true, simulated: false }),
    back: async () => ({ url: "https://example.com", simulated: false }),
    forward: async () => ({ url: "https://example.com", simulated: false }),
    wait: async () => ({ ok: true }),
    close: async () => {},
    read: async (url) => ({ url, text: "Login", simulated: false }),
    compare: async (offers) => offers,
    fillForm: async () => ({ ok: true }),
    prepareCheckout: async (offer) => ({
      product: offer.product,
      seller: offer.seller,
      itemPrice: offer.price,
      deliveryCost: offer.deliveryCost,
      tax: 0,
      fees: 0,
      total: offer.price + offer.deliveryCost,
      currency: offer.currency,
      checkoutUrl: offer.url,
      paymentAuthorised: false,
      simulated: false,
    }),
  };
  return { tool, typed, clicked };
}

describe("trusted browser task capabilities", () => {
  it("uses an opaque credential id and never returns resolved secret values", async () => {
    const { tool, typed, clicked } = browser([
      { selector: "#email", tag: "input", label: "Email" },
      { selector: "#password", tag: "input", label: "Password" },
      { selector: "#otp", tag: "input", label: "Verification code" },
      { selector: "#submit", tag: "button", label: "Sign in" },
    ]);
    const resolveCredential = vi.fn(async () => ({
      id: "cred-1",
      domain: "example.com",
      username: "owner@example.com",
      password: "top-secret",
      totpCode: "123456",
    }));

    const result = await runBoundedBrowserTask(
      tool,
      {
        url: "https://example.com/login",
        steps: [{ action: "login", credential_id: "cred-1" }],
      },
      ["example.com"],
      { resolveCredential },
    );

    expect(result.ok).toBe(true);
    expect(resolveCredential).toHaveBeenCalledWith({ credentialId: "cred-1", requestedDomain: "example.com" });
    expect(typed).toEqual([
      ["#email", "owner@example.com"],
      ["#password", "top-secret"],
      ["#otp", "123456"],
    ]);
    expect(clicked).toEqual(["#submit"]);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("top-secret");
    expect(serialized).not.toContain("123456");
    expect(serialized).not.toContain("owner@example.com");
    expect(result.outputs[1]).toMatchObject({
      action: "login",
      result: { authenticated_with_credential: "cred-1", secrets_exposed_to_model: false },
    });
  });

  it("stores a download and never returns raw bytes", async () => {
    const { tool } = browser([
      { selector: "a.invoice", tag: "a", label: "Download invoice", href: "https://example.com/invoice.pdf" },
    ]);
    const captureDownload = vi.fn(async () => ({
      filename: "invoice.pdf",
      mimeType: "application/pdf",
      sizeBytes: 4,
      data: new Uint8Array([1, 2, 3, 4]),
    }));
    const storeDownload = vi.fn(async () => ({ artifact_id: "artifact-1", private: true }));

    const result = await runBoundedBrowserTask(
      tool,
      {
        url: "https://example.com/orders",
        steps: [{ action: "download", label: "Download invoice" }],
      },
      ["example.com"],
      { captureDownload, storeDownload },
    );

    expect(result.ok).toBe(true);
    expect(captureDownload).toHaveBeenCalledWith(expect.objectContaining({ selector: "a.invoice" }));
    expect(storeDownload).toHaveBeenCalledTimes(1);
    expect(result.outputs[1]).toMatchObject({
      action: "download",
      result: {
        artifact_id: "artifact-1",
        filename: "invoice.pdf",
        size_bytes: 4,
        private: true,
        bytes_exposed_to_model: false,
      },
    });
    expect(JSON.stringify(result)).not.toContain("1,2,3,4");
  });
});
