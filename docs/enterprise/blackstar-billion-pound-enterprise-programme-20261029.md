# Blackstar enterprise commercial programme — 29 October 2026

## Objective and evidence posture

Build a credible path to a large, durable Blackstar software-and-services business by **productising existing Blackstar capabilities** for enterprise customers. A billion-pound **valuation** is an aspiration, not a result promised by this catalogue. The £100,000 and £1,000,000 price points are **indicative proposals chosen by Blackstar**, not validated customer willingness-to-pay, booked revenue, cash received, or formal quotes. No customer demand, completed deployments, recurring revenue or ROI numbers have yet been supplied.

The implementation in this branch adds 14 **proposed commercial solution blueprints** to a public `/enterprise-solutions` route, linked from the existing Marketplace and homepage. Each offer has a target buyer, proposed schedule, precisely scoped deliverables, acceptance evidence, buyer prerequisites, exclusions and copyable draft statement-of-work outline. It does **not** create 14 separate production services or publish a fake inventory of ready-to-deliver products.

## The offer set

| Offer | Proposed fee | Core customer result | Depends upon |
| --- | ---: | --- | --- |
| Private Knowledge Intelligence Hub | £100,000 | Governed document search and evidence | AI Hub, memory and connector authorization |
| Enterprise AI Workforce Deployment | £100,000 | Three supervised workflows | Workforce, Mission Control and approvals |
| Executive Intelligence Command Centre | £100,000 | Reconciled decision reports | Company/Industry, trusted sources |
| AI Governance & Compliance Sentinel | £100,000 | Auditable controls and risk processes | Policy, audit and owner/legal review |
| Retail & Commerce Intelligence Suite | £100,000 | Scoped commerce decisions and operator workflows | Retail connectors, metric verification |
| Customer Operations Agent Centre | £100,000 | Escalating service agents | Workforce, verified knowledge and service desk |
| Software Engineering & QA Foundry | £100,000 | Reviewed issue-to-PR delivery | Code tools, CI and approvals |
| Enterprise Website Studio Factory | £100,000 | Three branded, reviewed web properties | Website Studio and licensed content |
| Cinema Studio Production Pipeline | £100,000 | Rights-cleared pilot scene package | Rendering workers, Cinema Studio acceptance |
| 3D Asset & Digital Twin Foundry | £100,000 | Verified sample 3D exports | Game Foundry, licensed tools and 3D worker |
| Group-Wide Intelligence Operating Platform | £1,000,000 | Multi-business-unit governed AI rollout | Multi-tenant rights, stable serving and support |
| Private AI Infrastructure & Model Operations | £1,000,000 | Private serving and model lifecycle | Contracted GPU, model licenses, DR planning |
| Multi-Brand Retail Intelligence Network | £1,000,000 | Supervised multi-region commerce intelligence | Integration breadth, legal/data segregation |
| Enterprise Creative & Digital Twin Network | £1,000,000 | Four-team asset/review production workflows | Rendering throughput, asset rights and workers |

See `src/lib/enterprise/high-value-offers.ts` for the full commercially scoped details.

## Why these prices need discovery

An enterprise buyer needs measurable value above total costs. Before confirming a fee, gather the **buyer's current workflow**, cost baseline, users, throughput, change impact and budget authority.

A defensible *structural* productivity case is:

`eligible users × workflows per user × minutes saved per workflow / 60 × loaded hourly cost × adoption rate`

This is not ROI until the buyer supplies baselines, actual pilot savings and costs. Separate risk avoidance, cost savings, speed and revenue hypotheses to avoid double-counting.

Offer fees should be calibrated using staffed delivery estimates, specialist contractors, project management, support obligations, hosting/API/compute, customer procurement overhead, implementation risk and required gross margin. **None of these are currently validated for these offers.**

## Buyer journey — proposal / contract first

1. Public buyer reads the curated Enterprise Solutions catalogue (not a `marketplace_listings` digital good).
2. Seller copies an indicative SOW outline and fills actual buyer identity, workflow, scope, data location, proof, services, staffing, milestones, payment terms and exclusions.
3. Only after genuine discovery and technical feasibility is a negotiated buyer quote approved.
4. Legal and security review covers privacy/DPIA where appropriate, processor/controller terms, licensing/IP, security, supplier diligence, accessibility, service levels, acceptance, liability, insurance and procurement.
5. Contract is signed and milestone invoices are approved through the company's normal legally agreed invoicing/payment flow. **No one-click Marketplace checkout or instant digital fulfilment**.
6. Delivery runs on Blackstar's existing project, agent, tool and approval infrastructure, with named human leads and staged sign-off.
7. Renewals, managed operations and seats may later become recurring commercial products, but their prices and retention must be tested with real customers.

Standard Stripe charge amounts in GBP are limited to eight-digit minor-unit amounts (up to **£999,999.99**) and may have more restrictive card-network limits. A £1 million engagement cannot use the current direct single-charge assumption. Any invoice-based financing or staged payment workflow must be separately reviewed and implemented. See [Stripe currencies and limits](https://docs.stripe.com/currencies).

Existing Marketplace `marketplace_listings` and seller Stripe Connect payments remain unmodified. Existing £3 listing fee and sale commissions remain unchanged; no fee logic is bypassed by these quote-only offers.

## Engineering and go-to-market release gates

### Gate A — proof before promotion
- Confirm the currently available provider/runtime for each promised module with exact deployment SHA and acceptance evidence.
- Verify agent creation, tool grants, browser navigation/extraction, approvals and audit for the proposed use cases.
- Verify retrieval privacy and relevant source grounding; record missing connectors and provider outages.
- Do not advertise Cinema/3D worker completion or GPU quality without actual rendering/export traces.
- Separate what already works, what needs implementation, third-party dependencies and unsupported deliverables.
- Obtain human sales/delivery approval before declaring an offer orderable.

### Gate B — minimum enterprise readiness
- Signed standard MSA/SOW templates reviewed by legal counsel; milestone acceptance, support, limitation of liability and DPA/security appendix.
- Buyer intake and opportunity workflow with CRM ownership, no public PII leakage, rate limits and retention rules.
- Tenant isolation, SSO, audit retention/export, backup/restore and measurable service-level goals.
- Support team, incident response, security testing, policies, subprocessors and commercial insurance.
- Procurement-compatible invoicing, collections/reconciliation and tax handling.
- Pilot reference cases and transparent limitations for each offered solution.

### Gate C — early sell-and-deliver validation
- Conduct 20 qualified discovery interviews across 2–3 verticals before assigning validated demand or price.
- Demonstrate 2 pilot workflows with measured baseline, actual success/failure evidence and a named buyer sponsor.
- Track proposal-to-paid conversion, average sales cycle, delivery cost, gross margin, acceptance time and renewal likelihood.
- Retire or narrow offerings without a feasible delivery team or measurable buyer outcome.
- Pursue only customer-consented case studies, not fabricated testimonials.

### Gate D — scalable platform and retention
- Convert high-demand custom scopes into reusable templates and governed agent skills.
- Build recurring annual workspace, support and managed-operation offerings with tested pricing and contractual renewals.
- Strengthen stable model hosting, connector breadth, multi-tenant isolation, deployment automation and monitoring.
- Develop partner delivery capacity and procurement support for complex £1 million programmes.
- Measure actual revenue, margin and annual recurring revenue before discussing valuation multiples.

## Illustrative scale arithmetic (NOT a forecast)

- 10 × £100,000 one-off projects = £1 million contracted programme fees *if sold*.
- 4 × £1 million programmes = £4 million *if sold*.
- 100 customers each paying £100,000 **per year** for an active recurring enterprise service would produce £10 million ARR before churn and discounts *only if that recurring product is contracted and delivered*.
- A £1 billion **company valuation** is not the same as revenue or a contract pipeline; it depends on demonstrated growth, margins, retention, market conditions and investor assessment.

## Known architectural limits and non-negotiables

- Continue from the existing `creativewebdesigneng-stack/palladium-ai-os` systems and never duplicate Workforce, Mission Control, AI Hub, USR, model gateway, MCP, Marketplace or payment ledgers.
- **No Production deployment, migrations or paid checkouts from this branch.** Publish only after exact CI and an independently checked Preview; keep PR draft.
- Every exposed price is labelled indicative and excludes VAT and third-party costs. No promise of certification, financial returns, legal advice, AGI-level capability, autonomous financial trades, rights to third-party creative content, or a ready-made customer deliverable.
- Legal/security due diligence should reflect [UK AI procurement guidance](https://www.gov.uk/government/publications/guidelines-for-ai-procurement/guidelines-for-ai-procurement) and [ICO supplier and third-party guidance](https://ico.org.uk/for-organisations/advice-and-services/audits/data-protection-audit-framework/toolkits/artificial-intelligence/contracts-and-third-parties/).

## Acceptance evidence for this branch

- **14** catalogued scopes: **10 × £100k** and **4 × £1m**.
- Web routes/components render and pass TypeScript/build checks.
- Every offer has three deliverables, acceptance evidence, buyer prerequisites and explicit exclusions.
- A proposal-outline control generates a nonbinding, buyer-editable SOW draft with pricing, proof requirements and no-payment disclaimers.
- No direct Stripe card payment, no false order, no Supabase data/Production changes.
- This is a **commercial catalogue MVP**, not completed delivery of the underlying enterprise projects.


## Buyer-led value screening implemented (29 October follow-on)

The catalogue now includes a client-side structural productivity value modeller at
`src/lib/enterprise/value-case.ts`, rendered by `EnterpriseValueCase.jsx`.
It selects an existing proposed offer and asks for *buyer-supplied* workflow volume,
minutes saved, loaded cost, adoption, the realisable proportion of saved time and
incremental annual running costs. No default customer numbers, PII submission,
automated quote, deal/CRM write, payment or execution is permitted.

- Annual gross productivity value = monthly volume × 12 × minutes / 60 ×
  loaded hourly cost × adoption fraction × realisation fraction.
- Annual operating value = gross annual productivity value − incremental annual
  running cost.
- Indicative three-year net value = 3 × annual operating value − programme fee.
- Three-year benefit/cost = 3 × annual gross benefit ÷ (programme fee +
  3 × annual running cost). Simple payback uses the programme fee divided
  by monthly annual net operating value, if positive.
- A *conservative screening heuristic* requires at least 1.5× three-year
  benefit/cost and simple payback no more than 24 months, plus buyer-specified
  evidence. This **does not** validate pricing, certify the model or approve a sale.
- Six independent-diligence items: measured baseline, pilot savings, buyer/budget,
  data/integration feasibility, security/privacy and delivery capacity. The
  checklist is explicitly self-reported, not persistent or authoritative.
- Tests under `src/lib/enterprise/__tests__/value-case.test.ts` cover arithmetic,
  £1m feasibility rejection, empty inputs, unsupported economics, evidence
  omissions, invalid bounds and negative net operating benefits.

**Limits:** A saved hour is not automatically an avoided payroll cost. This model
is a narrow productivity case, not a risk-reduction, revenue uplift, defensive
security or private-infrastructure valuation. Such cases need separate customer
baselines and a credible causal impact model, not arbitrary added benefits.
Figures exclude inflation, discounting, the adoption ramp, taxes and some indirect
transformation costs unless explicitly included by the buyer. Independent
financial validation, performance evidence, contract pricing and legal sign-off
remain release gates. The catalogue is still a draft; security issue #1031 blocks
full CI and Preview certification until patched dependencies and the genuine Bun
lockfile are reconciled.
