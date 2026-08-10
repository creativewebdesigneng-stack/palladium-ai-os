// Mock data for the PalladiumAI Finance Centre.
// IMPORTANT: All figures are illustrative mock data — not real financial information.

export const DISCLAIMER = 'Figures shown are illustrative mock data and do not represent real financial information.';

export const METRICS = [
  { id: 'revenue', label: 'Revenue (YTD)', value: '$1,284,000', delta: '+14.2%', up: true, tone: 'text-emerald-300' },
  { id: 'expenses', label: 'Expenses (YTD)', value: '$742,000', delta: '+6.4%', up: false, tone: 'text-rose-300' },
  { id: 'profit', label: 'Net Profit', value: '$542,000', delta: '+22.1%', up: true, tone: 'text-emerald-300' },
  { id: 'invoices', label: 'Open Invoices', value: '38', delta: '4 overdue', up: false, tone: 'text-amber-300' },
  { id: 'payments', label: 'Payments (30d)', value: '$184,200', delta: '+8.6%', up: true, tone: 'text-emerald-300' },
  { id: 'budgets', label: 'Budget Used', value: '62%', delta: 'On track', up: true, tone: 'text-sky-300' },
];

export const SECTIONS = [
  { id: 'transactions', label: 'Transactions', icon: 'ArrowLeftRight' },
  { id: 'invoices', label: 'Invoices', icon: 'FileText' },
  { id: 'customers', label: 'Customers', icon: 'Users' },
  { id: 'expenses', label: 'Expenses', icon: 'Receipt' },
  { id: 'reports', label: 'Reports', icon: 'FileBarChart' },
];

export const REVENUE_SERIES = [
  { k: 'Mar', revenue: 92000, profit: 38000 }, { k: 'Apr', revenue: 104000, profit: 42000 },
  { k: 'May', revenue: 118000, profit: 51000 }, { k: 'Jun', revenue: 132000, profit: 62000 },
  { k: 'Jul', revenue: 144000, profit: 68000 }, { k: 'Aug', revenue: 156000, profit: 74000 },
];

export const EXPENSE_BREAKDOWN = [
  { name: 'Salaries', value: 420000, tone: 'from-violet-600/40 to-indigo-600/40' },
  { name: 'AI / Cloud', value: 142000, tone: 'from-sky-600/40 to-blue-600/40' },
  { name: 'Marketing', value: 96000, tone: 'from-fuchsia-600/40 to-pink-600/40' },
  { name: 'Operations', value: 54000, tone: 'from-amber-600/40 to-orange-600/40' },
  { name: 'Other', value: 30000, tone: 'from-emerald-600/40 to-teal-600/40' },
];

export const TRANSACTIONS = [
  { id: 'tx1', date: 'Aug 7', desc: 'Stripe payout — subscriptions', type: 'income', amount: 48200, account: 'Operating' },
  { id: 'tx2', date: 'Aug 6', desc: 'AWS — cloud infrastructure', type: 'expense', amount: 12400, account: 'AI / Cloud' },
  { id: 'tx3', date: 'Aug 5', desc: 'Invoice #PI-2048 paid — Northwind', type: 'income', amount: 24000, account: 'Operating' },
  { id: 'tx4', date: 'Aug 4', desc: 'Payroll run — August', type: 'expense', amount: 86000, account: 'Salaries' },
  { id: 'tx5', date: 'Aug 3', desc: 'LinkedIn Ads', type: 'expense', amount: 6400, account: 'Marketing' },
  { id: 'tx6', date: 'Aug 2', desc: 'Invoice #PI-2051 paid — Vertex', type: 'income', amount: 32000, account: 'Operating' },
  { id: 'tx7', date: 'Aug 1', desc: 'Notion — team plan', type: 'expense', amount: 480, account: 'Operations' },
  { id: 'tx8', date: 'Jul 30', desc: 'Refund — Cobalt (partial)', type: 'expense', amount: 1800, account: 'Operations' },
];

export const INVOICE_STATUS = {
  paid: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20',
  sent: 'text-sky-300 bg-sky-400/10 border-sky-400/20',
  overdue: 'text-rose-300 bg-rose-400/10 border-rose-400/20',
  draft: 'text-zinc-300 bg-white/5 border-white/10',
};

export const INVOICES = [
  { id: 'PI-2054', customer: 'Northwind Labs', amount: 48000, status: 'sent', due: 'Aug 14', issued: 'Jul 31' },
  { id: 'PI-2053', customer: 'Helio Health', amount: 96000, status: 'overdue', due: 'Aug 2', issued: 'Jul 18' },
  { id: 'PI-2051', customer: 'Vertex Robotics', amount: 32000, status: 'paid', due: 'Jul 25', issued: 'Jul 11' },
  { id: 'PI-2048', customer: 'Northwind Labs', amount: 24000, status: 'paid', due: 'Jul 18', issued: 'Jul 4' },
  { id: 'PI-2046', customer: 'Meridian Media', amount: 12000, status: 'sent', due: 'Aug 20', issued: 'Aug 6' },
  { id: 'PI-2044', customer: 'Cobalt Logistics', amount: 64000, status: 'draft', due: 'Aug 28', issued: 'Aug 7' },
];

export const CUSTOMERS = [
  { id: 'cu1', name: 'Vertex Robotics', ar: 92000, ltv: 184000, status: 'current', lastPaid: 'Jul 25' },
  { id: 'cu2', name: 'Helio Health', ar: 96000, ltv: 96000, status: 'overdue', lastPaid: 'Jun 30' },
  { id: 'cu3', name: 'Northwind Labs', ar: 48000, ltv: 72000, status: 'current', lastPaid: 'Aug 5' },
  { id: 'cu4', name: 'Meridian Media', ar: 12000, ltv: 32000, status: 'current', lastPaid: 'Jul 20' },
  { id: 'cu5', name: 'Cobalt Logistics', ar: 64000, ltv: 210000, status: 'current', lastPaid: 'Aug 1' },
  { id: 'cu6', name: 'Aurora Bank', ar: 0, ltv: 0, status: 'prospect', lastPaid: '—' },
];

export const CUSTOMER_STATUS = {
  current: 'text-emerald-300 bg-emerald-400/10',
  overdue: 'text-rose-300 bg-rose-400/10',
  prospect: 'text-zinc-300 bg-white/5',
};

export const EXPENSES = [
  { id: 'ex1', date: 'Aug 4', category: 'Salaries', vendor: 'Payroll', amount: 86000, status: 'posted' },
  { id: 'ex2', date: 'Aug 6', category: 'AI / Cloud', vendor: 'AWS', amount: 12400, status: 'posted' },
  { id: 'ex3', date: 'Aug 3', category: 'Marketing', vendor: 'LinkedIn', amount: 6400, status: 'posted' },
  { id: 'ex4', date: 'Aug 1', category: 'Operations', vendor: 'Notion', amount: 480, status: 'posted' },
  { id: 'ex5', date: 'Jul 30', category: 'Operations', vendor: 'Refund — Cobalt', amount: 1800, status: 'posted' },
  { id: 'ex6', date: 'Jul 28', category: 'Marketing', vendor: 'Figma', amount: 2400, status: 'posted' },
];

export const REPORTS = [
  { id: 'r1', name: 'P&L Statement', period: 'Q3 2026', type: 'Profit & Loss', updated: 'Aug 6' },
  { id: 'r2', name: 'Cash Flow', period: 'Aug 2026', type: 'Cash Flow', updated: 'Aug 7' },
  { id: 'r3', name: 'Balance Sheet', period: 'Aug 2026', type: 'Balance Sheet', updated: 'Aug 7' },
  { id: 'r4', name: 'Expense Breakdown', period: 'YTD 2026', type: 'Expense', updated: 'Aug 5' },
  { id: 'r5', name: 'Revenue by Customer', period: 'YTD 2026', type: 'Revenue', updated: 'Aug 4' },
];

export const AI_TOOLS = [
  { id: 'invoice', label: 'Invoice Processing', desc: 'Extract fields and route invoices', icon: 'FileText', tone: 'from-violet-600/40 to-indigo-600/40' },
  { id: 'expense', label: 'Expense Categorisation', desc: 'Auto-categorise transactions', icon: 'Receipt', tone: 'from-sky-600/40 to-blue-600/40' },
  { id: 'reports', label: 'Financial Reports', desc: 'Generate P&L, cash flow, AR aging', icon: 'FileBarChart', tone: 'from-fuchsia-600/40 to-pink-600/40' },
  { id: 'payments', label: 'Payment Monitoring', desc: 'Track due & overdue invoices', icon: 'CreditCard', tone: 'from-amber-600/40 to-orange-600/40' },
  { id: 'budget', label: 'Budget Analysis', desc: 'Compare spend vs budget', icon: 'Wallet', tone: 'from-emerald-600/40 to-teal-600/40' },
];

export const BUDGET = [
  { category: 'Salaries', budget: 480000, spent: 420000 },
  { category: 'AI / Cloud', budget: 160000, spent: 142000 },
  { category: 'Marketing', budget: 120000, spent: 96000 },
  { category: 'Operations', budget: 72000, spent: 54000 },
];