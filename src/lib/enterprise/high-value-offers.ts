/**
 * Blackstar's proposed high-value enterprise solution packages.
 *
 * This is a curated offer catalogue, NOT a digital asset listing, an available
 * production deployment, an instant purchase, an asserted ROI, or a promise
 * that all described capabilities have already passed acceptance.
 *
 * Reuses existing Workforce, Mission Control, AI Hub, Universal Skills
 * Registry, model routing, provider/connector infrastructure, approvals,
 * audit, Marketplace and specialist studio surfaces. No duplicate runtime.
 */
export type EnterpriseOffer = {
  id: string;
  name: string;
  priceGbp: 100000 | 1000000;
  category: "AI infrastructure" | "Automation" | "Governance" | "Commerce" | "Developer tools" | "Creative production";
  buyer: string;
  summary: string;
  proposedDeliveryWeeks: string;
  proposedDeliverables: readonly [string, string, string];
  acceptanceEvidence: string;
  prerequisites: string;
  boundaries: string;
};

export const BLACKSTAR_ENTERPRISE_OFFERS: readonly EnterpriseOffer[] = [
  {
    id: "private-knowledge-intelligence",
    name: "Private Knowledge Intelligence Hub",
    priceGbp: 100000, category: "AI infrastructure", buyer: "CIO · Knowledge operations",
    summary: "Scoped internal knowledge search and answer workflows with permission-aware retrieval and cited source evidence.",
    proposedDeliveryWeeks: "12–16",
    proposedDeliverables: [
      "Connect up to three approved document repositories and define access scopes",
      "Configure one grounded research workflow inside the existing AI Hub and Mission Control",
      "Hand over retrieval evaluation, source-access tests, administrator training and runbooks",
    ],
    acceptanceEvidence: "Cited test answers, access-isolation checks, agreed retrieval accuracy sample and signed customer UAT.",
    prerequisites: "Customer-owned content, source permissions, identity provider and designated data steward.",
    boundaries: "No promise to ingest every source or certify accuracy without the buyer's approved evaluation set.",
  },
  {
    id: "agent-workforce-deployment",
    name: "Enterprise AI Workforce Deployment",
    priceGbp: 100000, category: "Automation", buyer: "COO · Business operations",
    summary: "Bounded agents for up to three approved business workflows with human approvals and operational oversight.",
    proposedDeliveryWeeks: "12–20",
    proposedDeliverables: [
      "Configure and test up to three specific Workforce agents with explicit skills and connector grants",
      "Implement approval checkpoints, rollback instructions and per-run evidence in Mission Control",
      "Deliver role-based operating guides, exception handling and training for named owners",
    ],
    acceptanceEvidence: "Three agreed end-to-end workflow demonstrations, denial-path tests and auditable action records.",
    prerequisites: "Named workflow owners, controlled test accounts, approved connector credentials and integration access.",
    boundaries: "No unrestricted agent autonomy, guaranteed headcount reduction or unapproved external writes.",
  },
  {
    id: "executive-intelligence-command",
    name: "Executive Intelligence Command Centre",
    priceGbp: 100000, category: "AI infrastructure", buyer: "CEO · Strategy office",
    summary: "An integrated company command dashboard with research, evidence-backed reporting and management controls.",
    proposedDeliveryWeeks: "12–16",
    proposedDeliverables: [
      "Configure up to five agreed operating KPIs with verified upstream data definitions",
      "Deliver executive decision briefs using existing Company, Industry and AI Hub workflows",
      "Implement exportable monthly packs, access controls and evidence/audit review",
    ],
    acceptanceEvidence: "Signed KPI definitions, reconciliation against source records and owner-approved dashboard acceptance.",
    prerequisites: "Authoritative reporting sources, metrics owner, approved data sharing and security review.",
    boundaries: "Not a replacement for audited financial statements or human executive decision-making.",
  },
  {
    id: "governance-sentinel",
    name: "AI Governance & Compliance Sentinel",
    priceGbp: 100000, category: "Governance", buyer: "CISO · General counsel · DPO",
    summary: "Governed AI rollout controls, impact-assessment workflows and reviewable policy evidence.",
    proposedDeliveryWeeks: "10–16",
    proposedDeliverables: [
      "Map the customer's approved use cases to existing approval, policy and audit controls",
      "Configure risk registers and evidence templates for up to four selected workflows",
      "Produce tabletop exercises, incident playbooks and training for responsible owners",
    ],
    acceptanceEvidence: "Documented control tests, incident exercise findings and approved action/remediation log.",
    prerequisites: "Customer legal/privacy leadership, policies, risk tolerance and named control owners.",
    boundaries: "Advisory and implementation support only; no legal advice or guarantee of regulatory certification.",
  },
  {
    id: "retail-commerce-intelligence",
    name: "Retail & Commerce Intelligence Suite",
    priceGbp: 100000, category: "Commerce", buyer: "Retail director · Ecommerce head",
    summary: "Commerce analytics and operator-approved merchandising workflows for one retail business.",
    proposedDeliveryWeeks: "12–18",
    proposedDeliverables: [
      "Integrate up to two approved store or catalogue data sources",
      "Configure demand, inventory and margin reporting with documented metric definitions",
      "Create operator-reviewed product-content and sales operations workflows",
    ],
    acceptanceEvidence: "Source-to-dashboard reconciliation, sample order/inventory checks and approved workflow demonstrations.",
    prerequisites: "Store permissions, verified product data, margin definitions and nominated retail managers.",
    boundaries: "No guaranteed sales lift, inventory purchase automation or speculative financial performance.",
  },
  {
    id: "customer-operations-ai",
    name: "Customer Operations Agent Centre",
    priceGbp: 100000, category: "Automation", buyer: "Customer experience director",
    summary: "A supervised support-agent programme with knowledge grounding and safe escalation.",
    proposedDeliveryWeeks: "10–16",
    proposedDeliverables: [
      "Configure two supervised enquiry classes with verified customer support references",
      "Connect one approved service desk and enforce escalation-to-human rules",
      "Deliver response-quality evaluation, audit samples and contact-centre handover",
    ],
    acceptanceEvidence: "Realistic test-ticket set, escalation tests, agent output reviews and agreed support-service UAT.",
    prerequisites: "Service desk access, approved support policies, representative redacted enquiries.",
    boundaries: "No autonomous refunds, legal commitments or claimed savings without measured outcomes.",
  },
  {
    id: "developer-delivery-foundry",
    name: "Software Engineering & QA Foundry",
    priceGbp: 100000, category: "Developer tools", buyer: "CTO · VP Engineering",
    summary: "Controlled coding-agent and quality-assurance workflows integrated with an existing software organisation.",
    proposedDeliveryWeeks: "12–18",
    proposedDeliverables: [
      "Connect approved repositories and build bounded issue-to-PR workflows",
      "Configure static checks, test evidence and reviewed code-change approval gates",
      "Deliver benchmark fixtures, CI integration and a maintainable operations handbook",
    ],
    acceptanceEvidence: "Reproducible test suite, reviewed PR examples, security/branch-protection checks and acceptance sign-off.",
    prerequisites: "Owner-authorised repository access, CI environment, test fixtures and review responsibilities.",
    boundaries: "No promise that AI-written code is bug-free or authorised to merge/deploy automatically.",
  },
  {
    id: "website-studio-enterprise",
    name: "Enterprise Website Studio Factory",
    priceGbp: 100000, category: "Developer tools", buyer: "Digital director · Agency leadership",
    summary: "Reusable website creation and review pipelines for a corporate web portfolio.",
    proposedDeliveryWeeks: "12–18",
    proposedDeliverables: [
      "Build a design system and templates for up to three agreed web properties",
      "Connect approved content/review workflows to Website Studio",
      "Deliver accessibility, performance, security and editorial acceptance reports",
    ],
    acceptanceEvidence: "Three agreed reference builds, deployment previews, accessibility test results and editorial UAT.",
    prerequisites: "Brand assets, approved content, domain ownership, publishing roles and hosting plan.",
    boundaries: "Third-party licenses, media rights, custom complex integrations and live traffic guarantees excluded.",
  },
  {
    id: "cinema-studio-production",
    name: "Cinema Studio Production Pipeline",
    priceGbp: 100000, category: "Creative production", buyer: "Studio producer · Media operations",
    summary: "A scoped, rights-cleared production proof with storyboards, continuity and rendering handoff.",
    proposedDeliveryWeeks: "12–20",
    proposedDeliverables: [
      "Configure a rights-cleared pilot production with up to six approved scenes",
      "Build the scene-to-shot continuity and rendering workflow in existing Cinema Studio",
      "Deliver sample segments, render evidence, assembly manifests and operator training",
    ],
    acceptanceEvidence: "Customer-approved shot list, actual render/manifest evidence, quality review and licensed-asset checklist.",
    prerequisites: "Approved scripts, assets, model-provider capacity, content rights and rendering budget.",
    boundaries: "No promise of cinema-grade feature-length generation, unrestricted rights or completed renders before worker acceptance.",
  },
  {
    id: "industrial-3d-asset-foundry",
    name: "3D Asset & Digital Twin Foundry",
    priceGbp: 100000, category: "Creative production", buyer: "Industrial innovation · Game studio",
    summary: "A focused image/model-to-3D production workflow with review and export acceptance.",
    proposedDeliveryWeeks: "12–20",
    proposedDeliverables: [
      "Configure up to twenty approved reference assets and target export specifications",
      "Integrate an available 3D worker into the existing Game Foundry pipeline",
      "Deliver topology, materials, export validation and documented asset QA",
    ],
    acceptanceEvidence: "Target-format export sample, topology/UV/texture inspection and customer asset UAT.",
    prerequisites: "Rights-cleared reference models/images, software licenses, machine capacity and export specs.",
    boundaries: "No guaranteed GTA V/ZModeler compatibility without actual import/export tests and licensed tooling.",
  },
  {
    id: "enterprise-intelligence-operating-platform",
    name: "Group-Wide Intelligence Operating Platform",
    priceGbp: 1000000, category: "AI infrastructure", buyer: "Group CIO · Executive committee",
    summary: "A multi-business-unit programme to deploy governed Blackstar workspaces, intelligence and supervised agents.",
    proposedDeliveryWeeks: "40–52",
    proposedDeliverables: [
      "Design multi-tenant rollout architecture and integrate up to six approved business units",
      "Deliver governance, model routing, secured knowledge and up to twelve scoped agent workflows",
      "Establish service operations, monitored usage, training, staged acceptance and support transition",
    ],
    acceptanceEvidence: "Separate acceptance per business unit, security assessment, representative performance/load evidence and executive sign-off.",
    prerequisites: "Enterprise procurement, implementation partner capacity, security contract, legal/DPA and agreed operating budget.",
    boundaries: "Infrastructure hosting, custom licensing and external provider usage require an agreed schedule and contract.",
  },
  {
    id: "sovereign-private-ai-infrastructure",
    name: "Private AI Infrastructure & Model Operations",
    priceGbp: 1000000, category: "AI infrastructure", buyer: "CIO · CISO · Infrastructure team",
    summary: "A controlled private-model serving and lifecycle programme for a customer's approved environments.",
    proposedDeliveryWeeks: "36–52",
    proposedDeliverables: [
      "Design approved private GPU architecture, secure model gateway and staged disaster recovery",
      "Integrate monitoring, routing, auditable approval controls and selected enterprise workloads",
      "Run benchmark, resiliency and security acceptance before handing over runbooks and training",
    ],
    acceptanceEvidence: "Customer-defined service tests, model identity evidence, recovery exercise and security acceptance.",
    prerequisites: "Procured infrastructure, appropriate GPU capacity, model licenses, security approvals and operations staffing.",
    boundaries: "GPU purchases, hosting, model weights and guarantees of frontier-model intelligence are not included by default.",
  },
  {
    id: "global-retail-intelligence-network",
    name: "Multi-Brand Retail Intelligence Network",
    priceGbp: 1000000, category: "Commerce", buyer: "Group retail CEO · Commerce COO",
    summary: "A multi-brand planning and governed commerce-operations programme for retail groups.",
    proposedDeliveryWeeks: "40–52",
    proposedDeliverables: [
      "Integrate up to ten agreed retail brands/regions under scoped data-governance rules",
      "Deliver multi-brand inventory, pricing and performance intelligence with human approval gates",
      "Provide reporting, exception playbooks, adoption training and staged support handover",
    ],
    acceptanceEvidence: "Brand-level reconciliation, tested access boundaries, exception management drills and buyer sign-off.",
    prerequisites: "Group data ownership, store integrations, access segregation and multi-region legal review.",
    boundaries: "No autonomous securities trading, price fixing, guaranteed revenue or unsupervised purchasing.",
  },
  {
    id: "studio-digital-twin-network",
    name: "Enterprise Creative & Digital Twin Network",
    priceGbp: 1000000, category: "Creative production", buyer: "Studio group · Industrial design group",
    summary: "Shared multi-team workflows for rights-cleared video, 3D and asset management.",
    proposedDeliveryWeeks: "40–52",
    proposedDeliverables: [
      "Design rights, asset lineage and review workflows for up to four production teams",
      "Integrate Cinema Studio, Game Foundry, rendering workers and approved storage pipelines",
      "Deliver representative output packages, reproducibility reports and technical operator handover",
    ],
    acceptanceEvidence: "Approved sample production assets, export/render tests, rights audit and delivery UAT.",
    prerequisites: "Rendering capacity, provider licenses, rights-cleared material, team access and a creative operations sponsor.",
    boundaries: "No claim that real-time AAA/game/cinema output exists until each production worker has passed acceptance.",
  },
];

export const ENTERPRISE_OFFER_TERMS = {
  currency: "GBP" as const,
  priceBasis: "Indicative programme fee, excluding VAT and third-party costs; not a binding quote",
  offerStatus: "Proposed solution blueprint; delivery subject to discovery, capability verification and signed agreement",
  procurement: "Buyer diligence, scoped SOW, security/data review, commercial approval, milestones, change control and acceptance required",
  payment: "Contract and invoicing only; no one-click Stripe Marketplace checkout, no immediate access or automated fulfilment",
  intellectualProperty: "Source/IP ownership and license terms must be negotiated in the statement of work",
} as const;

export function getBlackstarEnterpriseOffer(id: string): EnterpriseOffer | null {
  return BLACKSTAR_ENTERPRISE_OFFERS.find((offer) => offer.id === id) ?? null;
}

export function formatEnterpriseGbp(amount: number): string {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error("Invalid enterprise amount");
  return new Intl.NumberFormat("en-GB", {
    style: "currency", currency: "GBP", maximumFractionDigits: 0,
  }).format(amount);
}

export function buildEnterpriseStatementOfWorkOutline(offer: EnterpriseOffer): string {
  return [
    `BLACKSTAR | INDICATIVE SCOPE OUTLINE (NOT AN AGREEMENT)`,
    `Offer: ${offer.name}`,
    `Reference: ${offer.id}`,
    `Indicative programme fee: ${formatEnterpriseGbp(offer.priceGbp)} (excluding VAT and third-party costs)`,
    `Proposed duration: ${offer.proposedDeliveryWeeks} weeks, subject to discovery`,
    `Buyer: ${offer.buyer}`,
    `Objective: ${offer.summary}`,
    `\nProposed deliverables:`,
    ...offer.proposedDeliverables.map((deliverable, i) => `${i + 1}. ${deliverable}`),
    `\nAcceptance evidence: ${offer.acceptanceEvidence}`,
    `Prerequisites: ${offer.prerequisites}`,
    `Scope exclusions and limitations: ${offer.boundaries}`,
    `\nCommercial safeguards: ${ENTERPRISE_OFFER_TERMS.procurement}`,
    `Payment route: ${ENTERPRISE_OFFER_TERMS.payment}`,
    `IP and data: ${ENTERPRISE_OFFER_TERMS.intellectualProperty}`,
    `\nBefore sale: confirm a named sponsor, baseline business metrics, solution feasibility, security/legal requirements, delivery team, payment milestones, acceptance tests and a mutually signed SOW.`,
    `Status: ${ENTERPRISE_OFFER_TERMS.offerStatus}.`,
  ].join("\n");
}
