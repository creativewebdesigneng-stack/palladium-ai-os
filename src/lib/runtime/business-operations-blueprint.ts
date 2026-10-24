/**
 * An opt-in mission blueprint for Blackstar's EXISTING Autonomous OS.
 *
 * Loading a blueprint fills in the existing goal form; it does not create
 * agents, start a scheduler, connect accounts, or execute a financial action.
 */
export const SIX_AGENT_BUSINESS_BLUEPRINT = {
  id: 'six-agent-business-operations-v1',
  name: 'Six-Agent Business Operations',
  description: 'Up to six existing specialists collaborate on a governed business workflow, with proof of work rather than income promises.',
  roles: [
    { id: 'research', name: 'Opportunity Research', task: 'Discover opportunities and document real sources, demand signals and uncertainty.', evidence: 'Dated sources and research brief' },
    { id: 'validation', name: 'Commercial Validation', task: 'Assess customer needs, competition, risks, unit economics and whether a proposed offer is viable.', evidence: 'Assumptions, costs and validation results' },
    { id: 'production', name: 'Offer & Delivery', task: 'Prepare an authorised product, service or digital deliverable using available tools and existing studios.', evidence: 'Inspectible deliverable and tool execution records' },
    { id: 'marketing', name: 'Marketing Studio', task: 'Create original campaigns, content drafts and measurable experiments without auto-publishing.', evidence: 'Draft assets and experiment plan' },
    { id: 'operations', name: 'Customer & Operations', task: 'Triage legitimate customer requests and prepare operational follow-ups without unsolicited outreach.', evidence: 'Reviewable drafts and escalation record' },
    { id: 'audit', name: 'Finance & Verification', task: 'Reconcile documented receipts, costs, approvals, tool runs and failed attempts; refuse unsupported income claims.', evidence: 'Source-linked results and net-outcome statement' },
  ],
} as const;

export function prepareSixAgentBusinessDraft() {
  const roles = SIX_AGENT_BUSINESS_BLUEPRINT.roles.map((role, index) =>
    String(index + 1) + '. ' + role.name + ': ' + role.task + ' Evidence: ' + role.evidence + '.'
  );

  return {
    blueprint_id: SIX_AGENT_BUSINESS_BLUEPRINT.id,
    name: SIX_AGENT_BUSINESS_BLUEPRINT.name,
    objective: [
      'Goal: run a bounded, evidence-led business-operations experiment using MY authorised business context and existing Blackstar agents, skills, tools and providers.',
      'Propose up to six specialist assignments with explicit handoffs, dependencies and success criteria. These are roles, not six automatically created agents. If a role has no configured capable agent, report it as unstaffed; never invent execution.',
      'Specialist roles:',
      ...roles,
      'First run: research, validate and prepare drafts only. Produce a reviewable proposed execution plan and identify the connected accounts or permissions required. No trading, transactions, purchases, price changes, public publishing, mass outreach or claims of revenue without the applicable existing approval and provider evidence.',
      'Record estimated versus observed costs and revenue separately. A simulated result, internal agent-economy credit, projection, scraped screenshot or unverifiable dashboard is NOT proof of earned or withdrawable income. Cite actual settlement/payment records when authorised and available; otherwise report revenue as unverified.',
      'Use the existing governed workflow queue, Workforce assignments, connected-service permissions, audit trail, spend and runtime ceilings, human approval gateway and emergency stop. Do not work around disabled tools, blocked domains, approvals or missing credentials.',
      'Deliver: six-role task plan (including unstaffed roles), research evidence, offer/experiment drafts, source-linked measured outcomes, unresolved blockers and next approval requests. Always distinguish planned, attempted, completed and financially settled actions.',
    ].join('\n\n'),
    autonomy_level: 'assisted',
    trigger_type: 'manual',
    schedule_cron: '',
    event_match: '',
    max_parallel_agents: '6',
    max_runtime_seconds: '600',
    budget_pounds: '1.00',
  };
}

export function businessBlueprintCriteria(id: string | null | undefined): Record<string, unknown> {
  if (id !== SIX_AGENT_BUSINESS_BLUEPRINT.id) return {};
  return {
    blueprint_id: SIX_AGENT_BUSINESS_BLUEPRINT.id,
    max_specialist_roles: 6,
    approval_required_for_external_actions: true,
    no_income_guarantees: true,
    evidence_requirements: [
      'tool_execution_receipts',
      'source_linked_deliverables',
      'separate_observed_and_projected_results',
      'verified_external_settlement_before_claiming_income',
      'report_unstaffed_or_blocked_roles',
    ],
  };
}
