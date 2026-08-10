import { useState } from 'react';
import { Info } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import FinanceToolbar from '@/components/finance/FinanceToolbar';
import FinanceMetricCards from '@/components/finance/FinanceMetricCards';
import FinanceCharts from '@/components/finance/FinanceCharts';
import AIFinancePanel from '@/components/finance/AIFinancePanel';
import { TransactionsView, InvoicesView, CustomersView, ExpensesView, ReportsView } from '@/components/finance/FinanceViews';
import { DISCLAIMER } from '@/components/finance/financeData';

export default function Finance() {
  const [section, setSection] = useState('transactions');
  const [toast, setToast] = useState(null);
  const [running, setRunning] = useState(null);
  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 1800); };

  const runTool = (id) => {
    setRunning(id);
    setTimeout(() => {
      setRunning(null);
      const labels = { invoice: 'Invoice Processing', expense: 'Expense Categorisation', reports: 'Financial Reports', payments: 'Payment Monitoring', budget: 'Budget Analysis' };
      flash(`${labels[id]} completed`);
    }, 1400);
  };

  return (
    <>
      <PageHeader eyebrow="Workspace" title="Finance Centre" description="Track revenue, expenses, profit, invoices, payments, and budgets with AI finance tools." action={
        <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-[11px] text-zinc-400 sm:flex"><Info className="h-3.5 w-3.5 text-zinc-500" />Mock data</div>
      } />

      <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[.06] px-3 py-2 text-[11px] text-amber-200/90"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><p>{DISCLAIMER}</p></div>

      <FinanceMetricCards />
      <div className="mt-4"><FinanceCharts /></div>
      <div className="mt-4"><AIFinancePanel onRun={runTool} running={running} /></div>

      <div className="mt-4"><FinanceToolbar section={section} setSection={setSection} onCreate={() => flash('New record form opened')} /></div>
      <div className="mt-4">
        {section === 'transactions' && <TransactionsView />}
        {section === 'invoices' && <InvoicesView />}
        {section === 'customers' && <CustomersView />}
        {section === 'expenses' && <ExpensesView />}
        {section === 'reports' && <ReportsView />}
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-white/10 bg-[#10121a] px-4 py-2 text-xs text-zinc-200 shadow-2xl">{toast}</div>}
    </>
  );
}