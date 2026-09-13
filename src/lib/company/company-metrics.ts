export type CompanyFinancialInputs = {
  revenue: number;
  cogs: number;
  operatingExpense: number;
  cash: number;
  monthlyBurn: number;
  receivables: number;
};

export type CompanyFinancialMetrics = {
  grossMarginPercent: number;
  operatingMarginPercent: number;
  simpleRunwayMonths: number;
  receivableDaysProxy: number;
  operatingProfit: number;
};

function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export function calculateCompanyFinancialMetrics(input: CompanyFinancialInputs): CompanyFinancialMetrics {
  const revenue = finite(input.revenue);
  const cogs = finite(input.cogs);
  const operatingExpense = finite(input.operatingExpense);
  const cash = finite(input.cash);
  const monthlyBurn = finite(input.monthlyBurn);
  const receivables = finite(input.receivables);

  const grossProfit = revenue - cogs;
  const operatingProfit = grossProfit - operatingExpense;

  return {
    grossMarginPercent: revenue !== 0 ? (grossProfit / revenue) * 100 : 0,
    operatingMarginPercent: revenue !== 0 ? (operatingProfit / revenue) * 100 : 0,
    simpleRunwayMonths: monthlyBurn > 0 ? cash / monthlyBurn : 0,
    receivableDaysProxy: revenue > 0 ? (receivables / revenue) * 365 : 0,
    operatingProfit,
  };
}
