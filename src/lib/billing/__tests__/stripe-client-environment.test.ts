import { afterEach, describe, expect, it } from "vitest";
import { createStripeClient } from "@/lib/stripe.server";

describe("Stripe client environment boundary", () => {
  const previousMode = process.env["PAYMENTS_ENVIRONMENT"];

  afterEach(() => {
    if (previousMode === undefined) delete process.env["PAYMENTS_ENVIRONMENT"];
    else process.env["PAYMENTS_ENVIRONMENT"] = previousMode;
  });

  it("rejects a browser-requested live client while the server is sandbox", () => {
    process.env["PAYMENTS_ENVIRONMENT"] = "sandbox";
    expect(() => createStripeClient("live")).toThrow(/configured for sandbox mode/);
  });

  it("rejects a browser-requested sandbox client while the server is live", () => {
    process.env["PAYMENTS_ENVIRONMENT"] = "live";
    expect(() => createStripeClient("sandbox")).toThrow(/configured for live mode/);
  });
});
