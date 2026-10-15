/**
 * PalladiumAI native agent-harness contracts.
 *
 * The architecture is informed by the MIT-licensed DeepSeek Harness project,
 * but this implementation deliberately composes PalladiumAI's existing model
 * gateway, approvals, checkpoints, MCP, memory and workflow runtime rather than
 * introducing a second agent runtime.
 */

export type HarnessDecision = "allow" | "approval" | "deny";
export type HarnessRisk = "low" | "medium" | "high" | "critical";
export type SandboxProfile = "read_only" | "workspace_write" | "networked" | "privileged";

export type HarnessPolicyInput = {
  tool: string;
  input?: Record<string, unknown>;
  risk?: HarnessRisk;
  mutating?: boolean;
  externalEffect?: boolean;
  destructive?: boolean;
  sandboxProfile?: SandboxProfile;
  requestedDomains?: string[];
  allowedDomains?: string[];
};

export type HarnessPolicyResult = {
  decision: HarnessDecision;
  risk: HarnessRisk;
  code: string;
  reason: string;
};

export const HARNESS_CAPABILITIES = [
  { id: "model_gateway", label: "Model gateway", mode: "native", surface: "/models", description: "Provider-neutral model routing and agent provider bindings." },
  { id: "checkpoints", label: "Durable checkpoints", mode: "native", surface: "/mission-control", description: "Run checkpoints, context journaling, resume and steering." },
  { id: "approvals", label: "Operator approvals", mode: "native", surface: "/mission-control", description: "Immutable approval requests for risky external actions." },
  { id: "workflows", label: "Workflow runtime", mode: "native", surface: "/workflows", description: "Queued workflows with pause/resume and approval support." },
  { id: "mcp", label: "MCP", mode: "native", surface: "/mcp-hub", description: "Model Context Protocol tools and connected servers." },
  { id: "memory", label: "Agent memory", mode: "native", surface: "/memory", description: "Durable user-scoped memory and verified learning." },
  { id: "skills", label: "Skills & tools", mode: "extended", surface: "/skills", description: "Reusable capabilities governed by server-side grants." },
  { id: "subagents", label: "Bounded sub-agents", mode: "extended", surface: "/workforce", description: "Delegation contracts that cannot escalate parent permissions." },
  { id: "policy_hooks", label: "Execution policy hooks", mode: "extended", surface: "/agent-runtime", description: "Deterministic pre-execution guardrails at the tool choke-point." },
  { id: "sandbox_profiles", label: "Sandbox profiles", mode: "extended", surface: "/agent-runtime", description: "Explicit execution envelopes for read, write, network and privileged work." },
] as const;

const SENSITIVE_KEY = /^(?:api[_-]?key|access[_-]?token|refresh[_-]?token|auth(?:orization)?|password|passwd|secret|private[_-]?key|cookie|session[_-]?token)$/i;

/** Bound inspection work, but never interpret uninspected input as safe. */
function inspectCredentialInput(value: unknown): "credential" | "limit" | null {
  const pending = [{ value, depth: 0 }];
  const seen = new WeakSet<object>();
  let inspected = 0;
  while (pending.length) {
    const item = pending.pop()!;
    if (++inspected > 10_000 || item.depth > 8) return "limit";
    if (item.value == null || typeof item.value !== "object") continue;
    if (seen.has(item.value)) return "limit";
    seen.add(item.value);
    const entries = Object.entries(item.value);
    if (entries.length + pending.length + inspected > 10_000) return "limit";
    for (const [key, child] of entries) {
      if (SENSITIVE_KEY.test(key) && child !== undefined && child !== null && String(child).trim() !== "") return "credential";
      pending.push({ value: child, depth: item.depth + 1 });
    }
  }
  return null;
}

function normalizeHarnessDomain(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 2048) return null;
  try {
    const raw = value.trim();
    if (/\s/.test(raw)) return null;
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
    if (!host || host.includes('*') || host.startsWith('.') || host.includes('..')) return null;
    return host;
  } catch { return null; }
}

export function normalizeHarnessDomains(domains: unknown): string[] {
  if (!Array.isArray(domains)) return [];
  return [...new Set(domains.map(normalizeHarnessDomain).filter((host):host is string=>host!==null))].slice(0, 50);
}

function domainAllowed(host: string, allowed: string[]) {
  return allowed.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

export function evaluateHarnessPolicy(input: HarnessPolicyInput): HarnessPolicyResult {
  const risk = input.risk ?? "low";
  const credentialInspection = inspectCredentialInput(input.input ?? {});
  if (credentialInspection === "limit") {
    return { decision: "deny", risk: "high", code: "input_inspection_limit", reason: "Tool input exceeds the bounded safety inspection. Reduce its nesting or size before retrying." };
  }
  if (credentialInspection === "credential") {
    return { decision: "deny", risk: "critical", code: "credential_input_blocked", reason: "Credentials and secrets must be injected by trusted server integrations, never supplied in agent tool input." };
  }

  if (input.sandboxProfile === "privileged") {
    return { decision: "deny", risk: "critical", code: "privileged_sandbox_blocked", reason: "Privileged execution is disabled in the general agent runtime." };
  }

  // Do not truncate requested targets before enforcement: a disallowed 51st
  // target must never disappear from the policy decision.
  for (const domains of [input.requestedDomains ?? [], input.allowedDomains ?? []]) {
    if (!Array.isArray(domains) || domains.length > 50 || domains.some(value=>normalizeHarnessDomain(value)===null)) {
      return { decision:'deny',risk:'high',code:'invalid_domain_scope',reason:'Network scope must contain at most 50 valid HTTP(S) host targets without credentials or wildcards.' };
    }
  }
  const requested = normalizeHarnessDomains(input.requestedDomains ?? []);
  const allowed = normalizeHarnessDomains(input.allowedDomains ?? []);
  // Missing network grants must fail closed, even before an approval step.
  // Harness reliability checks from both uploaded collections should validate
  // security invariants at runtime, not rely on model reasoning.
  if (requested.length && requested.some((host) => !domainAllowed(host, allowed))) {
    return { decision: "deny", risk: "high", code: "domain_outside_allowlist", reason: "The requested network target is outside the agent's allow-list." };
  }

  if (input.destructive || risk === "critical") {
    return { decision: "approval", risk: risk === "low" ? "high" : risk, code: "destructive_action", reason: "Destructive or critical actions require explicit operator approval." };
  }

  if (input.mutating || input.externalEffect || input.sandboxProfile === "workspace_write" || input.sandboxProfile === "networked" || risk === "high") {
    return { decision: "approval", risk: risk === "low" ? "medium" : risk, code: "external_or_mutating_action", reason: "Writes, external side effects and elevated execution profiles require operator approval." };
  }

  return { decision: "allow", risk, code: "safe_read", reason: "Read-only execution is permitted by the harness policy." };
}

export type SubagentSpawnInput = {
  depth: number;
  maxDepth?: number;
  parentTools: string[];
  requestedTools: string[];
};

export function evaluateSubagentSpawn(input: SubagentSpawnInput): HarnessPolicyResult {
  const validTools = (tools: unknown): tools is string[] => Array.isArray(tools) && tools.length <= 200 && tools.every(tool => typeof tool === "string" && tool.trim().length > 0 && tool.length <= 160);
  if (!Number.isSafeInteger(input.depth) || input.depth < 0 ||
      (input.maxDepth !== undefined && (!Number.isSafeInteger(input.maxDepth) || input.maxDepth < 0)) ||
      !validTools(input.parentTools) || !validTools(input.requestedTools)) {
    return { decision: "deny", risk: "high", code: "invalid_subagent_scope", reason: "Delegation requires non-negative integer depths and bounded explicit tool names." };
  }
  const maxDepth = Math.min(input.maxDepth ?? 2, 4);
  if (input.depth >= maxDepth) {
    return { decision: "deny", risk: "high", code: "subagent_depth_exceeded", reason: `Sub-agent depth is capped at ${maxDepth}.` };
  }
  const parent = new Set(input.parentTools);
  if (input.requestedTools.some((tool) => !parent.has(tool))) {
    return { decision: "deny", risk: "high", code: "subagent_permission_escalation", reason: "A child agent cannot receive tools that its parent does not have." };
  }
  return { decision: "allow", risk: "low", code: "subagent_bounded", reason: "Sub-agent delegation remains within the parent permission envelope." };
}

export function assertHarnessToolInput(tool: string, input: Record<string, unknown>, allowedDomains: string[] = []): HarnessPolicyResult {
  const requestedUrl = typeof input["url"] === "string" ? input["url"] : "";
  let requestedDomains: string[] = [];
  // Validate the original URL: extracting only the hostname would hide embedded
  // credentials, and swallowing parse failures would remove the network request.
  if (/^https?:/i.test(requestedUrl.trim())) requestedDomains = [requestedUrl];
  return evaluateHarnessPolicy({ tool, input, requestedDomains, allowedDomains });
}
