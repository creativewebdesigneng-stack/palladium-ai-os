/**
 * Buyer-facing planning definitions for the existing £100k supervised
 * Enterprise AI Workforce proposal. NOT executable agent configurations,
 * a tool allowlist, a certified deployment or a purchase mechanism.
 */
export type WorkforcePilotId =
  | "research_briefing"
  | "customer_triage_draft"
  | "engineering_qa_draft";

export type WorkforcePilotBlueprint = {
  id: WorkforcePilotId;
  title: string;
  businessOutcome: string;
  buyerPrerequisites: string;
  supervision: string;
  forbiddenActions: string;
  fourAcceptanceTrials: readonly [string, string, string, string];
};

export const WORKFORCE_PILOT_BLUEPRINTS: readonly WorkforcePilotBlueprint[] = [
  {
    id: "research_briefing",
    title: "Research & Executive Briefing",
    businessOutcome: "A source-linked draft intelligence briefing with named editorial review.",
    buyerPrerequisites: "Agreed public domains, licensed internal documents, named research sponsor and reviewer.",
    supervision: "Current browser/tool approval controls plus final human editorial approval.",
    forbiddenActions: "No unrestricted crawling, private-network access, fabricated citations or automatic publishing.",
    fourAcceptanceTrials: [
      "Approved read-only retrieval produces traceable source evidence and draft output.",
      "Rejecting a browser/tool approval produces no external action.",
      "An out-of-scope destination/tool is blocked without execution.",
      "A failed retrieval is recorded accurately, never presented as completed research.",
    ],
  },
  {
    id: "customer_triage_draft",
    title: "Customer Service Operations",
    businessOutcome: "Classified support enquiries, policy-grounded draft replies and clear escalation.",
    buyerPrerequisites: "Approved sandbox support tickets, service policies, consent and a named escalation owner.",
    supervision: "Human approval before every customer-facing external write or send.",
    forbiddenActions: "No autonomous refunds, account changes, sensitive data disclosures or binding commitments.",
    fourAcceptanceTrials: [
      "Approved sandbox ticket triage creates a reviewable draft with policy evidence.",
      "A rejected customer-facing write is never executed.",
      "Unauthorised service-desk writes are denied with a traceable audit entry.",
      "Tool outage or missing customer policy evidence results in a failed or escalated case.",
    ],
  },
  {
    id: "engineering_qa_draft",
    title: "Software Engineering & QA",
    businessOutcome: "Scoped test and code-change proposals for developer review.",
    buyerPrerequisites: "An authorised QA repository, branch protection, CI fixtures and nominated engineering reviewer.",
    supervision: "Owner-approved code tools and independent human PR review before merge/deployment.",
    forbiddenActions: "No direct Production deployment, unreviewed merge, arbitrary command execution or secret exposure.",
    fourAcceptanceTrials: [
      "Approved isolated code/test run produces a reviewable QA change with test evidence.",
      "Rejected code execution produces zero repository mutations.",
      "Unapproved repository access or tool requests are blocked and logged.",
      "Compilation/test failure is reported, with no claim of a successful release.",
    ],
  },
];

export function buildWorkforcePilotPlanningOutline(blueprint: WorkforcePilotBlueprint): string {
  return [
    "BLACKSTAR | ENTERPRISE WORKFORCE PILOT PLAN (DRAFT — NOT ACCEPTANCE EVIDENCE)",
    "Proposed offer: Enterprise AI Workforce Deployment",
    "Selected workflow: " + blueprint.title,
    "Business outcome: " + blueprint.businessOutcome,
    "Buyer prerequisites: " + blueprint.buyerPrerequisites,
    "Approval and review: " + blueprint.supervision,
    "Prohibited actions: " + blueprint.forbiddenActions,
    "Four mandatory test paths:",
    ...blueprint.fourAcceptanceTrials.map((test, index) => (index + 1) + ". " + test),
    "Release requirements: genuine permissioned run evidence, zero external execution on denial,",
    "durable approval/audit links, quality and security review, scoped customer UAT, signed SOW.",
    "The offline twelve-case validator is a self-consistency check only; it is not runtime proof.",
    "No tool grants, agent execution, purchases, binding quote or certification are created.",
  ].join("\n");
}
