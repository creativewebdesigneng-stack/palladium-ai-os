import { useState } from 'react';
import { ClipboardCopy, ShieldCheck, TriangleAlert, Workflow } from 'lucide-react';
import {
  WORKFORCE_PILOT_BLUEPRINTS,
  buildWorkforcePilotPlanningOutline,
} from '@/lib/enterprise/workforce-pilot';

/**
 * Commercial scoping only: this does not execute agents, inspect live customer
 * data or represent signed acceptance. Reuses the existing enterprise catalogue.
 */
export default function EnterpriseWorkforcePilot() {
  const [selectedId, setSelectedId] = useState(WORKFORCE_PILOT_BLUEPRINTS[0].id);
  const [copyStatus, setCopyStatus] = useState('');
  const selected = WORKFORCE_PILOT_BLUEPRINTS.find(workflow => workflow.id === selectedId) ||
    WORKFORCE_PILOT_BLUEPRINTS[0];

  async function copyPilotPlan() {
    setCopyStatus('');
    try {
      await navigator.clipboard.writeText(buildWorkforcePilotPlanningOutline(selected));
      setCopyStatus('Draft planning outline copied. Customer discovery and independent evidence are still required.');
    } catch {
      setCopyStatus('Clipboard unavailable. Review the four acceptance trials on this page instead.');
    }
  }

  return (
    <section aria-labelledby="enterprise-workforce-pilot-title" className="space-y-4 rounded-2xl border border-amber-300/20 bg-white/[.025] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.15em] text-amber-300">
            <Workflow className="h-4 w-4"/>Enterprise delivery planning
          </p>
          <h3 id="enterprise-workforce-pilot-title" className="mt-2 text-lg font-semibold text-white">
            Supervised AI Workforce — three-workflow pilot
          </h3>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-zinc-400">
            Explore candidate deployment scopes and their mandatory human-control tests.
            These are proposed workflows, not running agents or verified customer installations.
          </p>
        </div>
        <span className="rounded-full border border-amber-300/25 px-3 py-1 text-[11px] text-amber-200">
          Proposed £100,000 programme
        </span>
      </div>
      <div role="group" aria-label="Choose workforce pilot workflow" className="grid gap-2 md:grid-cols-3">
        {WORKFORCE_PILOT_BLUEPRINTS.map(workflow => (
          <button
            key={workflow.id}
            type="button"
            aria-pressed={selectedId === workflow.id}
            onClick={() => { setSelectedId(workflow.id); setCopyStatus(''); }}
            className={'rounded-xl border px-4 py-3 text-left text-xs font-medium transition ' +
              (selectedId === workflow.id
                ? 'border-amber-300/50 bg-amber-300/10 text-amber-100'
                : 'border-white/10 bg-black/20 text-zinc-300 hover:border-white/25')}
          >
            {workflow.title}
          </button>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-white">{selected.title}</h4>
          <p className="text-xs leading-6 text-zinc-300">{selected.businessOutcome}</p>
          <dl className="space-y-3 text-xs leading-5">
            <div>
              <dt className="font-semibold text-zinc-200">Customer prerequisites</dt>
              <dd className="mt-1 text-zinc-400">{selected.buyerPrerequisites}</dd>
            </div>
            <div>
              <dt className="font-semibold text-zinc-200">Approval boundary</dt>
              <dd className="mt-1 text-zinc-400">{selected.supervision}</dd>
            </div>
            <div>
              <dt className="font-semibold text-zinc-200">Explicit exclusions</dt>
              <dd className="mt-1 text-zinc-400">{selected.forbiddenActions}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <h4 className="flex items-center gap-2 text-xs font-semibold text-white">
            <ShieldCheck className="h-4 w-4 text-amber-300"/>Four required acceptance paths
          </h4>
          <ol className="mt-3 space-y-3 text-xs leading-5 text-zinc-300">
            {selected.fourAcceptanceTrials.map((trial, index) => (
              <li className="flex gap-2" key={trial}>
                <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full border border-white/15 text-[10px] text-amber-200">
                  {index + 1}
                </span>
                <span>{trial}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
        <p className="flex max-w-2xl items-start gap-2 text-[11px] leading-5 text-zinc-400">
          <TriangleAlert className="mt-0.5 h-4 w-4 flex-none text-amber-300"/>
          The offline QA gate checks submitted evidence structure only. Live agent actions,
          tenant permissions, zero-execution denial, support obligations and buyer sign-off
          require separate independent verification.
        </p>
        <button type="button" onClick={copyPilotPlan}
          className="inline-flex items-center gap-2 rounded-lg border border-amber-300/40 px-3 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-300/10">
          <ClipboardCopy className="h-4 w-4"/>Copy draft pilot plan
        </button>
      </div>
      {copyStatus && <p role="status" className="text-xs text-amber-200">{copyStatus}</p>}
    </section>
  );
}
