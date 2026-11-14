import { describe, expect, it } from "vitest";
import { buildCommercialReport, monthlyRecurringPence } from "../commercial-report";
import { earlyFraudCustomer, subscriptionRefundSignal } from "../subscription-charge-signals";

describe("commercial report", () => {
  it("prices recognised subscriptions from the catalogue and leaves Explorer at zero", () => {
    expect(
      monthlyRecurringPence({
        plan_code: "builder",
        stripe_price_id: "builder_monthly_150_gbp",
      }),
    ).toBe(15_000);
    expect(
      monthlyRecurringPence({
        plan_code: "enterprise",
        stripe_price_id: "enterprise_yearly_35700_gbp",
      }),
    ).toBe(297_500);
    expect(
      monthlyRecurringPence({
        plan_code: "explorer",
        stripe_price_id: "explorer_monthly",
      }),
    ).toBe(0);
    expect(monthlyRecurringPence({ plan_code: "builder", stripe_price_id: "pro_monthly" })).toBe(
      15_000,
    );

    const report = buildCommercialReport({
      subscriptions: [
        { plan_code: "builder", status: "active", stripe_price_id: "builder_monthly_150_gbp" },
        { plan_code: "explorer", status: "active", stripe_price_id: "free" },
        { plan_code: "business", status: "past_due", stripe_price_id: "business_monthly_1500_gbp" },
        {
          plan_code: "enterprise",
          status: "canceled",
          stripe_price_id: "enterprise_monthly_3500_gbp",
        },
      ],
      orders: [
        {
          status: "paid",
          sale_price_pence: 10_000,
          platform_fee_pence: 200,
          seller_net_pence: 9_800,
          refunded_pence: 0,
          currency: "GBP",
        },
        {
          status: "refunded",
          sale_price_pence: 5_000,
          platform_fee_pence: 100,
          seller_net_pence: 4_900,
          refunded_pence: 5_000,
          currency: "GBP",
        },
        {
          status: "pending",
          sale_price_pence: 9_999,
          platform_fee_pence: 0,
          seller_net_pence: 0,
          currency: "GBP",
        },
      ],
      settlements: [
        {
          transfer_pence: 9_800,
          transfer_reversed_pence: 1_000,
          application_fee_pence: 200,
          application_fee_refunded_pence: 50,
          currency: "GBP",
        },
      ],
    });

    expect(report.subscriptions).toEqual({
      activePaid: 1,
      pastDue: 1,
      legacyExplorer: 1,
      recognisedMonthlyPence: 15_000,
      pastDueMonthlyPence: 150_000,
    });
    expect(report.marketplace).toMatchObject({
      orderCount: 2,
      grossSalePence: 15_000,
      refundedPence: 5_000,
      netSalePence: 10_000,
    });
    expect(report.payouts.transferNetPence).toBe(8_800);
    expect(report.payouts.applicationFeeNetPence).toBe(150);
    expect(report.payouts.bankPayoutConfirmed).toBe(false);
  });
});

describe("subscription charge signals", () => {
  it("audits a subscription refund without treating a Marketplace order as one", () => {
    expect(
      subscriptionRefundSignal(
        {
          customer: "cus_test",
          amount_refunded: 15_000,
          currency: "gbp",
        },
        false,
      ),
    ).toEqual({
      record: true,
      metric: "billing.subscription_refunded",
      customerId: "cus_test",
      quantity: 150,
      unit: "gbp",
    });
    expect(
      subscriptionRefundSignal(
        { customer: "cus_test", amount_refunded: 100, currency: "gbp" },
        true,
      ),
    ).toEqual({
      record: false,
      reason: "marketplace",
    });
    expect(
      subscriptionRefundSignal({ customer: "not-a-customer", amount_refunded: 100 }, false).record,
    ).toBe(false);
  });

  it("reads a fraud-warning customer only from a Stripe customer id", () => {
    expect(earlyFraudCustomer({ customer: { id: "cus_fraud" } })).toBe("cus_fraud");
    expect(earlyFraudCustomer({ customer: "acct_other" })).toBeNull();
    expect(earlyFraudCustomer(null)).toBeNull();
  });
});
