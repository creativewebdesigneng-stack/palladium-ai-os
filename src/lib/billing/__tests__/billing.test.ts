/**
 * Highest-risk billing tests: Stripe webhook signature verification and the
 * plan <-> price mapping the frontend is never allowed to influence.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  normalizePlanCode,
  planForPriceKey,
  priceKeyForPlan,
  pricePenceForPlan,
} from "../catalog";
import { verifyWebhook } from "@/lib/stripe.server";

const SECRET = "whsec_test_secret";

async function signedRequest(
  body: string,
  opts: { secret?: string; timestamp?: number; signature?: string } = {},
) {
  const timestamp = opts.timestamp ?? Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(opts.secret ?? SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${body}`),
  );
  const v1 = opts.signature ?? Buffer.from(new Uint8Array(signed)).toString("hex");
  return new Request("https://app.test/api/public/payments/webhook?env=sandbox", {
    method: "POST",
    headers: { "stripe-signature": `t=${timestamp},v1=${v1}` },
    body,
  });
}

describe("plan catalog", () => {
  it("maps internal plan codes to the current approved Stripe lookup keys", () => {
    expect(priceKeyForPlan("builder", "monthly")).toBe("builder_monthly_150_gbp");
    expect(priceKeyForPlan("builder", "yearly")).toBe("builder_yearly_1530_gbp");
    expect(priceKeyForPlan("business", "monthly")).toBe("business_monthly_1500_gbp");
    expect(priceKeyForPlan("business", "yearly")).toBe("business_yearly_15300_gbp");
    expect(priceKeyForPlan("enterprise", "monthly")).toBe("enterprise_monthly_3500_gbp");
    expect(priceKeyForPlan("enterprise", "yearly")).toBe("enterprise_yearly_35700_gbp");
  });

  it("maps paid plans to the expected GBP amounts in pence", () => {
    expect(pricePenceForPlan("builder", "monthly")).toBe(15_000);
    expect(pricePenceForPlan("builder", "yearly")).toBe(153_000);
    expect(pricePenceForPlan("business", "monthly")).toBe(150_000);
    expect(pricePenceForPlan("business", "yearly")).toBe(1_530_000);
    expect(pricePenceForPlan("enterprise", "monthly")).toBe(350_000);
    expect(pricePenceForPlan("enterprise", "yearly")).toBe(3_570_000);
  });

  it("never resolves a price for the free plan", () => {
    expect(priceKeyForPlan("explorer", "monthly")).toBeNull();
    expect(priceKeyForPlan("free", "yearly")).toBeNull();
    expect(pricePenceForPlan("explorer", "monthly")).toBeNull();
  });

  it("rejects plan codes and raw price ids injected by a client", () => {
    expect(normalizePlanCode("price_1AttackerControlled")).toBeNull();
    expect(priceKeyForPlan("price_1AttackerControlled", "monthly")).toBeNull();
    expect(priceKeyForPlan({ plan: "enterprise" }, "monthly")).toBeNull();
    expect(planForPriceKey("price_1AttackerControlled")).toBeNull();
  });

  it("resolves current and historic webhook price keys back to a plan", () => {
    expect(planForPriceKey("builder_yearly_1530_gbp")).toBe("builder");
    expect(planForPriceKey("business_monthly_1500_gbp")).toBe("business");
    expect(planForPriceKey("enterprise_monthly_3500_gbp")).toBe("enterprise");
    expect(planForPriceKey("pro_yearly")).toBe("builder");
    expect(planForPriceKey("business_yearly")).toBe("business");
    expect(planForPriceKey("enterprise_monthly")).toBe("enterprise");
  });
});

describe("stripe webhook verification", () => {
  beforeEach(() => {
    process.env["PAYMENTS_SANDBOX_WEBHOOK_SECRET"] = SECRET;
  });

  it("accepts a correctly signed, fresh payload", async () => {
    const body = JSON.stringify({ type: "customer.subscription.created", data: { object: {} } });
    const event = await verifyWebhook(await signedRequest(body), "sandbox");
    expect(event.type).toBe("customer.subscription.created");
  });

  it("rejects a forged signature", async () => {
    const body = JSON.stringify({ type: "customer.subscription.created", data: { object: {} } });
    await expect(
      verifyWebhook(await signedRequest(body, { signature: "deadbeef" }), "sandbox"),
    ).rejects.toThrow(/Invalid webhook signature/);
  });

  it("rejects a payload signed with the wrong secret", async () => {
    const body = JSON.stringify({ type: "invoice.paid", data: { object: {} } });
    await expect(
      verifyWebhook(await signedRequest(body, { secret: "whsec_attacker" }), "sandbox"),
    ).rejects.toThrow(/Invalid webhook signature/);
  });

  it("rejects a tampered body under a valid old signature", async () => {
    const body = JSON.stringify({ type: "invoice.paid", data: { object: { plan: "explorer" } } });
    const request = await signedRequest(body);
    const forged = new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify({ type: "invoice.paid", data: { object: { plan: "enterprise" } } }),
    });
    await expect(verifyWebhook(forged, "sandbox")).rejects.toThrow(/Invalid webhook signature/);
  });

  it("rejects replayed events outside the freshness window", async () => {
    const body = JSON.stringify({ type: "invoice.paid", data: { object: {} } });
    const stale = Math.floor(Date.now() / 1000) - 4000;
    await expect(
      verifyWebhook(await signedRequest(body, { timestamp: stale }), "sandbox"),
    ).rejects.toThrow(/timestamp too old/);
  });

  it("rejects requests with no signature header", async () => {
    const request = new Request("https://app.test/api/public/payments/webhook?env=sandbox", {
      method: "POST",
      body: "{}",
    });
    await expect(verifyWebhook(request, "sandbox")).rejects.toThrow(/Missing signature/);
  });
});
