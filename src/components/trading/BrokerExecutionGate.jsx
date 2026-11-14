import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useServerFn } from '@tanstack/react-start';
import { getTradingBrokerDecision } from '@/lib/trading/trading-broker.functions';

export default function BrokerExecutionGate() {
  const decide = useServerFn(getTradingBrokerDecision);
  const [decision, setDecision] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function check() {
    setBusy(true);
    setError('');
    try {
      setDecision(await decide({ data: {} }));
    } catch (cause) {
      setDecision(null);
      setError(cause instanceof Error ? cause.message : 'Broker status is unavailable.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[24px] border border-amber-300/15 bg-amber-400/[.03] p-5 md:p-6" aria-label="Broker execution">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-amber-100"><ShieldCheck className="h-4 w-4" /><h2 className="font-medium text-white">Broker execution</h2></div>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-zinc-400">Paper simulation is the default. A live order is sent only by a connected broker adapter behind explicit authorisation. This control checks that boundary and does not contact a broker.</p>
        </div>
        <button type="button" onClick={check} disabled={busy} className="rounded-xl border border-amber-200/20 bg-amber-200/10 px-4 py-2 text-xs font-medium text-amber-50 disabled:opacity-40">
          {busy ? 'Checking…' : 'Check live-order boundary'}
        </button>
      </div>
      {error && <p role="alert" className="mt-3 rounded-xl border border-rose-300/15 bg-rose-300/[.05] p-3 text-xs text-rose-100">{error}</p>}
      {decision && (
        <div role="status" className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-zinc-300">
          <p className="font-medium text-white">Mode: {decision.mode}. Live execution: {decision.liveExecution ? 'open' : 'closed'}.</p>
          <p className="mt-1">{decision.reason}</p>
        </div>
      )}
    </section>
  );
}
