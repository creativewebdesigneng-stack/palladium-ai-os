/**
 * Strict, read-only QA task launch helper for the existing agent runtime.
 * This does not execute a tool or create/approve a task. The signed-in operator
 * explicitly starts the agent run and still has to approve the real operation.
 */
export const NETWORK_QA_PUBLIC_URL = 'https://httpbingo.org/html';

type AgentChoice = {
  id?: string; status?: string; allowed_tools?: string[] | null;
};
type ToolChoice = { slug?: string; enabled?: boolean; executable?: boolean };
type ToolPermission = {
  agent_id?: string | null; tool?: string; enabled?: boolean;
  allowed_domains?: string[] | null;
};

const specimens = {
  web_search: {
    input: { query: 'Playwright browser automation documentation', limit: 5 },
  },
  web_fetch: {
    input: { url: NETWORK_QA_PUBLIC_URL },
  },
  http_request: {
    input: { url: NETWORK_QA_PUBLIC_URL, method: 'GET' },
  },
} as const;

export function isNetworkCertificationTool(slug: string | undefined) {
  return Boolean(slug && Object.hasOwn(specimens, slug));
}

export function networkCertificationTask(
  tool: ToolChoice | null | undefined,
  agent: AgentChoice | null | undefined,
  permissions: ToolPermission[] = [],
): { eligible: boolean; reason: string; input?: string } {
  const slug = tool?.slug;
  if (!slug || !isNetworkCertificationTool(slug)) {
    return { eligible: false, reason: 'Only read-only web_search, web_fetch and HTTP GET are available in this QA launcher.' };
  }
  if (!agent?.id || agent.status !== 'active') {
    return { eligible: false, reason: 'Select an active agent before starting a governed certification run.' };
  }
  if (!tool?.enabled || tool.executable === false) {
    return { eligible: false, reason: 'This tool is disabled or not executable for the selected workspace.' };
  }
  if (!agent.allowed_tools?.includes(slug)) {
    return { eligible: false, reason: `Assign ${slug} to this agent through the existing agent editor first.` };
  }
  const override = permissions.find(p => p.tool === slug && p.agent_id === agent.id);
  if (override?.enabled === false) {
    return { eligible: false, reason: 'This agent has an explicit disabled-tool override.' };
  }
  if (slug !== 'web_search' && !override?.allowed_domains?.some(domain => domain === 'httpbingo.org')) {
    return {
      eligible: false,
      reason: 'Configure the existing agent-specific httpbingo.org domain allow-list and approval controls before testing.',
    };
  }
  const spec = specimens[slug as keyof typeof specimens];
  const params = JSON.stringify(spec.input);
  const input = [
    'Blackstar QA read-only tool certification task.',
    `Use exactly the existing ${slug} tool once with these exact JSON arguments: ${params}.`,
    'This is a real tool-execution test, not a simulation or a request to describe how the tool works.',
    'Respect every existing permission, spend cap, domain restriction, and operator approval. Do not switch tools or attempt external writes.',
    'If approval is required, queue the executable approval and pause this same task until an operator approves it.',
    'Do not invent success, a response, a receipt or an audit record. If the real operation does not run, report that it remains unverified.',
    'After real execution, briefly report what the tool actually returned. Certification is decided by server-side execution and approval receipts, not by your answer.',
  ].join(' ');
  return { eligible: true, reason: 'Operator-triggered agent model call; may incur provider usage and needs any queued human approval.', input };
}
