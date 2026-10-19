import TableSurface from '@/components/palladium/TableSurface';

const STATE_LABELS = {
  browser_verified: 'Verified approved browser task',
  local_verified: 'Verified approved local task',
  execution_recorded: 'Execution recorded — provider not certified',
  simulated_only: 'Simulated result only — not certified',
  approval_activity: 'Approval/queue activity only',
  failed_only: 'Failed execution only',
  not_tested: 'No execution evidence',
  not_executable: 'Not executable',
};

export default function ToolEvidencePanel({ rows = [], scope }) {
  const totals = Object.fromEntries(Object.keys(STATE_LABELS).map(key => [
    key, rows.filter(row => row.state === key).length,
  ]));
  const verified = (totals.browser_verified || 0) + (totals.local_verified || 0);
  const recorded = totals.execution_recorded || 0;
  return <section aria-label="Agent tool evidence" className="mb-5 space-y-2 rounded-2xl border border-white/10 bg-white/[.03] p-4">
    <h2 className="text-sm font-semibold text-zinc-100">Tool execution evidence</h2>
    <p className="text-xs text-zinc-400">
      {rows.length} registered tools. {verified} with matched approved completion receipts;
      { ' ' }{recorded} with execution records only;
      { ' ' }{totals.failed_only || 0} with failed attempts only;
      { ' ' }{totals.not_tested || 0} not tested;
      { ' ' }{totals.simulated_only || 0} simulated-only. No connector is certified merely for appearing in the catalogue.
    </p>
    <p className="text-[11px] text-zinc-500">
      Scope: {scope === 'recent_60_executions' ? 'up to the most recent 60 owner-scoped execution records and 60 browser approvals' : 'available execution records'}.
      A recorded success alone is not a certification. Verified browser and bounded local tasks need matching approved receipts, original non-simulated outputs and completed task status. Other provider and worker tools require separate live checks.
    </p>
    <details className="rounded-lg border border-white/10 bg-black/20 p-3">
      <summary className="cursor-pointer text-xs font-medium text-violet-200">Review evidence for every tool</summary>
      <TableSurface label="Agent tool execution evidence" className="mt-3" minWidth={540} maxHeight={320}>
        <table className="text-xs">
          <thead><tr className="border-b border-white/10 text-zinc-400"><th scope="col" className="py-2 pr-2">Tool</th><th scope="col" className="py-2 pr-2">Evidence status</th><th scope="col" className="py-2">Observed runs</th></tr></thead>
          <tbody>{rows.map(row => <tr key={row.slug} className="border-b border-white/5">
            <td className="py-2 pr-2 text-zinc-200">{row.slug}</td>
            <td className="py-2 pr-2 text-zinc-400">{STATE_LABELS[row.state] || 'Unknown'}</td>
            <td className="py-2 text-zinc-400">{row.observedAttempts || 0}</td>
          </tr>)}</tbody>
        </table>
      </TableSurface>
    </details>
  </section>;
}
