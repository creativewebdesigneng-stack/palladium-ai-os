import { describe, expect, it } from 'vitest';
import { calculateCompanyFinancialMetrics } from './company-metrics';

describe('calculateCompanyFinancialMetrics', () => {
  it('calculates margins, runway and receivable-days proxy deterministically', () => {
    const result = calculateCompanyFinancialMetrics({
      revenue: 1_000_000,
      cogs: 550_000,
      operatingExpense: 300_000,
      cash: 500_000,
      monthlyBurn: 75_000,
      receivables: 180_000,
    });

    expect(result.grossMarginPercent).toBeCloseTo(45);
    expect(result.operatingMarginPercent).toBeCloseTo(15);
    expect(result.simpleRunwayMonths).toBeCloseTo(6.6666667);
    expect(result.receivableDaysProxy).toBeCloseTo(65.7);
    expect(result.operatingProfit).toBe(150_000);
  });

  it('fails closed to zero for undefined denominator scenarios', () => {
    const result = calculateCompanyFinancialMetrics({
      revenue: 0,
      cogs: 10,
      operatingExpense: 20,
      cash: 100,
      monthlyBurn: 0,
      receivables: 50,
    });

    expect(result.grossMarginPercent).toBe(0);
    expect(result.operatingMarginPercent).toBe(0);
    expect(result.simpleRunwayMonths).toBe(0);
    expect(result.receivableDaysProxy).toBe(0);
  });
});
