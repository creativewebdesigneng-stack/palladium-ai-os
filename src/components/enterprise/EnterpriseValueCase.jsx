import { useMemo, useState } from 'react';
import { Calculator, ClipboardCheck, ShieldAlert } from 'lucide-react';
import { BLACKSTAR_ENTERPRISE_OFFERS } from '@/lib/enterprise/high-value-offers';
import { ENTERPRISE_EVIDENCE_REQUIREMENTS, evaluateEnterpriseValueCase } from '@/lib/enterprise/value-case';

const FIELDS = [
  ['monthlyWorkflowVolume', 'Eligible workflows per month', 100000000, 1],
  ['minutesSavedPerWorkflow', 'Minutes genuinely saved per workflow', 1440, 0.1],
  ['loadedHourlyCostGbp', 'Loaded labour cost (£/hour)', 10000, 0.01],
  ['adoptionPercent', 'Expected adoption (%)', 100, 1],
  ['realizedSavingsPercent', 'Realised / redeployed saving (%)', 100, 1],
  ['annualOperatingCostGbp', 'Incremental annual running cost (£)', 10000000000, 1],
];
const EMPTY = Object.fromEntries(FIELDS.map(([key]) => [key, '0']));
const gbp = (value) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(value);

export default function EnterpriseValueCase() {
  const [offerId, setOfferId] = useState(BLACKSTAR_ENTERPRISE_OFFERS[0].id);
  const [values, setValues] = useState(EMPTY);
  const [evidence, setEvidence] = useState({});
  const offer = BLACKSTAR_ENTERPRISE_OFFERS.find(item => item.id === offerId) || BLACKSTAR_ENTERPRISE_OFFERS[0];
  const { model, error } = useMemo(() => {
    try {
      return {
        model: evaluateEnterpriseValueCase(
          offer,
          Object.fromEntries(FIELDS.map(([key]) => [key, values[key] === '' ? 0 : Number(values[key])])),
          evidence,
        ),
        error: null,
      };
    } catch (error) {
      return { model: null, error: error instanceof Error ? error.message : 'Invalid inputs' };
    }
  }, [offer, values, evidence]);
  const hasBuyerBaseline = model && model.status !== 'missing-baseline';

  return (
    <section aria-labelledby="enterprise-value-heading" className="rounded-2xl border border-amber-300/15 bg-[#101016] p-5 sm:p-7">
      <div className="flex items-start gap-3">
        <Calculator className="mt-1 h-5 w-5 text-amber-300" aria-hidden="true" />
        <div>
          <h3 id="enterprise-value-heading" className="text-lg font-semibold text-white">Does this programme justify the buyer's investment?</h3>
          <p className="mt-2 max-w-3xl text-xs leading-6 text-zinc-400">
            Structural value case only. Enter a prospective buyer's real baseline and operating costs; no values are invented.
            These figures stay in this browser view and are not submitted as leads, quotes or verified evidence.
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <label className="block text-xs text-zinc-300">Proposed solution
            <select value={offerId} onChange={event => { setOfferId(event.target.value); setEvidence({}); }}
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#181820] p-2.5 text-xs text-zinc-100">
              {BLACKSTAR_ENTERPRISE_OFFERS.map(item => <option key={item.id} value={item.id}>{item.name} — {gbp(item.priceGbp)}</option>)}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            {FIELDS.map(([key, label, max, step]) => (
              <label key={key} className="text-xs leading-5 text-zinc-300">{label}
                <input type="number" inputMode="decimal" min="0" max={max} step={step}
                  value={values[key]} onChange={event => setValues(previous => ({ ...previous, [key]: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-2.5 text-sm text-white focus:border-amber-300/40 focus:outline-none" />
              </label>
            ))}
          </div>
          <p className="text-[11px] leading-5 text-zinc-500">
            Model: monthly volume × 12 × minutes saved ÷ 60 × loaded hourly cost × adoption × realised saving.
            Annual operating cost must include ongoing hosting, support, providers, licensing and delivery expenses attributable to the solution.
          </p>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-black/25 p-4" aria-live="polite">
            <p className="text-xs font-semibold text-white">Customer value screening</p>
            {error ? <p role="alert" className="mt-3 text-xs text-rose-300">{error}</p>
            : !hasBuyerBaseline ? <p className="mt-3 text-xs leading-5 text-zinc-400">Missing buyer baseline. No ROI or payback estimate is available until the customer supplies workflow volume, verified time savings and cost inputs.</p>
            : <>
              <dl className="mt-3 grid grid-cols-2 gap-3">
                <div><dt className="text-[11px] text-zinc-500">Annual gross productivity value</dt><dd className="mt-1 text-base font-semibold text-white">{gbp(model.annualGrossProductivityValueGbp)}</dd></div>
                <div><dt className="text-[11px] text-zinc-500">Annual value after operating cost</dt><dd className="mt-1 text-base font-semibold text-white">{gbp(model.annualNetOperatingValueGbp)}</dd></div>
                <div><dt className="text-[11px] text-zinc-500">3-year value after programme fee</dt><dd className="mt-1 text-base font-semibold text-white">{gbp(model.threeYearNetValueAfterProgrammeGbp)}</dd></div>
                <div><dt className="text-[11px] text-zinc-500">Simple payback</dt><dd className="mt-1 text-base font-semibold text-white">{model.simplePaybackMonths === null ? 'Not achieved' : model.simplePaybackMonths.toFixed(1) + ' months'}</dd></div>
              </dl>
              <p className="mt-4 text-xs text-amber-200">Three-year benefit / total modelled cost: {model.threeYearBenefitCostRatio.toFixed(2)}×</p>
              <p className="mt-2 text-[11px] leading-5 text-zinc-400">
                {model.status === 'economics-not-supported'
                  ? 'This scenario does not meet the conservative screening threshold (1.5× 3-year benefit/cost and payback within 24 months). Re-scope or gather stronger evidence; do not assert the asking price is justified.'
                  : model.status === 'needs-evidence'
                    ? 'Illustrative economics clear the screening threshold, but independent technical, financial and legal proof is missing.'
                    : 'Self-reported inputs clear the screening checklist. A real proposal still requires independent validation, approval and negotiation.'}
              </p>
            </>}
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="flex items-center gap-2 text-xs font-semibold text-white"><ClipboardCheck className="h-4 w-4 text-amber-300"/>Evidence required before a proposal</p>
            <p className="mt-2 text-[11px] text-zinc-500">Tick only items independently checked with the buyer. This is a local self-assessment and does not certify anything.</p>
            <div className="mt-3 space-y-2">
              {ENTERPRISE_EVIDENCE_REQUIREMENTS.map(({ key, label }) => (
                <label key={key} className="flex items-start gap-2 text-[11px] leading-5 text-zinc-300">
                  <input type="checkbox" checked={evidence[key] === true}
                    onChange={event => setEvidence(previous => ({ ...previous, [key]: event.target.checked }))}
                    className="mt-1 accent-amber-300" />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <p className="mt-3 flex items-start gap-2 text-[11px] leading-5 text-zinc-500"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300"/>
              No buyer identity, approved delivery capacity, verified pilot or signed agreement is recorded by this calculator. It cannot authorise a sale or deployment.
            </p>
          </div>
        </div>
      </div>
      <p className="mt-5 text-[11px] leading-5 text-zinc-500">
        Illustrative steady-state productivity economics over 36 months. Excludes implementation ramp, discounting,
        taxes, change-management disruption and intangible benefits. A saved hour is not necessarily a cash saving.
        Do not add revenue lift or risk avoidance to the same workflow without proving the benefits are independent.
      </p>
    </section>
  );
}
