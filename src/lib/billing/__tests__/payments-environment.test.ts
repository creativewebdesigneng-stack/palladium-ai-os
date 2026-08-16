import { afterEach, describe, expect, it } from "vitest";
import { getServerStripeEnvironment } from "@/lib/stripe.server";

describe("server Stripe environment", () => {
  const previous = process.env["PAYMENTS_ENVIRONMENT"];

  afterEach(() => {
    if (previous === undefined) delete process.env["PAYMENTS_ENVIRONMENT"];
    else process.env["PAYMENTS_ENVIRONMENT"] = previous;
  });

  it("defaults safely to sandbox when no server mode is configured", () => {
    delete process.env["PAYMENTS_ENVIRONMENT"];
    expect(getServerStripeEnvironment()).toBe("sandbox");
  });

  it("uses live mode only when explicitly configured server-side", () => {
    process.env["PAYMENTS_ENVIRONMENT"] = "live";
    expect(getServerStripeEnvironment()).toBe("live");
  });

  it("rejects invalid server configuration instead of guessing", () => {
    process.env["PAYMENTS_ENVIRONMENT"] = "production";
    expect(() => getServerStripeEnvironment()).toThrow(/PAYMENTS_ENVIRONMENT/);
  });
});
