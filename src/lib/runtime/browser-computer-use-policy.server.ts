import {
  buildBlackstarComputerUsePlan,
  type BlackstarComputerUsePlan,
  type BlackstarComputerUseStep,
} from "@/lib/ai-hub/computer-use";

const MODEL_CONTROLLED_ACTIONS = new Set([
  "navigate",
  "read",
  "extract",
  "click",
  "type",
  "scroll",
  "wait",
  "screenshot",
  "validate",
]);

function text(value: unknown, max = 4000) {
  return (typeof value === "string" ? value.trim() : "").slice(0, max);
}

function mapStep(value: unknown): BlackstarComputerUseStep | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const action = text(row["action"], 40);
  if (!MODEL_CONTROLLED_ACTIONS.has(action)) return null;

  const mappedAction = action === "validate" ? "read" : action;
  if (
    mappedAction !== "navigate" &&
    mappedAction !== "read" &&
    mappedAction !== "extract" &&
    mappedAction !== "click" &&
    mappedAction !== "type" &&
    mappedAction !== "scroll" &&
    mappedAction !== "wait" &&
    mappedAction !== "screenshot"
  ) return null;

  const step: BlackstarComputerUseStep = { action: mappedAction };
  const url = text(row["url"], 2000);
  const selector = text(row["selector"], 500);
  const valueText = text(row["text"], 8000);
  const label = text(row["label"], 120);
  if (url) step.url = url;
  if (selector) step.selector = selector;
  if (valueText) step.text = valueText;
  if (label) step.purpose = label;
  if (row["direction"] === "up" || row["direction"] === "down") step.direction = row["direction"];
  const amount = Number(row["amount"]);
  if (Number.isFinite(amount)) step.amount = amount;
  const ms = Number(row["ms"]);
  if (Number.isFinite(ms)) step.ms = ms;
  return step;
}

/**
 * Adapts the live browser-task payload into the Blackstar Computer Use policy.
 * Trusted server-side login/download actions are deliberately excluded: they
 * already have credential/artifact boundaries and never expose secrets/bytes to
 * the model. Generic tool approval remains authoritative for operator approval.
 */
export function buildBrowserTaskComputerUsePlan(
  input: Record<string, unknown>,
  allowedDomains: string[],
): BlackstarComputerUsePlan {
  const rawSteps = Array.isArray(input["steps"]) ? input["steps"] : [];
  const steps = rawSteps.map(mapStep).filter((step): step is BlackstarComputerUseStep => Boolean(step));
  const requestedMax = Number(input["max_steps"] ?? 12);
  const maximumSteps = Math.min(20, Math.max(1, Number.isFinite(requestedMax) ? Math.trunc(requestedMax) : 12));

  if (steps.length === 0) {
    return {
      allowedDomains: [...new Set(allowedDomains.map((value) => value.trim().toLowerCase().replace(/^www\./, "")).filter(Boolean))].slice(0, 50),
      decisions: [],
      executable: true,
      requiresApproval: false,
      blockedCount: 0,
    };
  }

  return buildBlackstarComputerUsePlan(steps, {
    allowedDomains,
    maximumSteps,
    allowTyping: true,
    allowFormFill: false,
    allowClicks: true,
    allowStorageState: false,
    requireApprovalForMutations: false,
  });
}

const RECORDED_ACTION_MAP: Record<string, BlackstarComputerUseStep["action"] | null> = {
  navigate: "navigate",
  read: "read",
  extract: "extract",
  click: "click",
  type: "type",
  scroll: "scroll",
  wait: "wait",
  screenshot: "screenshot",
  back: "back",
  forward: "forward",
  close: "close",
  fill_form: "fill_form",
  search: "read",
  compare: "read",
  prepare_checkout: null,
};

export type BrowserComputerUseVerdict = {
  engine: "blackstar_computer_use";
  executable: boolean;
  requiresApproval: boolean;
  blockedCount: number;
  allowedDomains: string[];
  reviewedSteps: number;
  firstBlockReason: string | null;
};

export function summarizeBrowserComputerUsePlan(plan: BlackstarComputerUsePlan): BrowserComputerUseVerdict {
  const firstBlocked = plan.decisions.find((decision) => !decision.allowed);
  return {
    engine: "blackstar_computer_use",
    executable: plan.executable,
    requiresApproval: plan.requiresApproval,
    blockedCount: plan.blockedCount,
    allowedDomains: plan.allowedDomains,
    reviewedSteps: plan.decisions.length,
    firstBlockReason: firstBlocked?.reason ?? null,
  };
}

export function buildRecordedSessionComputerUsePlan(
  steps: Array<{ kind?: unknown; target?: unknown; detail?: unknown }>,
  allowedDomains: string[],
): BlackstarComputerUsePlan {
  const mapped: BlackstarComputerUseStep[] = [];
  for (const step of steps.slice(0, 30)) {
    const kind = text(step.kind, 40);
    const action = RECORDED_ACTION_MAP[kind];
    if (!action) continue;
    const target = text(step.target, 2000);
    const detail = text(step.detail, 500);
    const mappedStep: BlackstarComputerUseStep = { action };
    if (/^https?:\/\//i.test(target)) mappedStep.url = target;
    else if (target) mappedStep.selector = target;
    if (detail) mappedStep.purpose = detail;
    mapped.push(mappedStep);
  }
  if (mapped.length === 0) {
    return {
      allowedDomains: [...new Set(allowedDomains.map((value) => value.trim().toLowerCase().replace(/^www\./, "")).filter(Boolean))].slice(0, 50),
      decisions: [],
      executable: true,
      requiresApproval: false,
      blockedCount: 0,
    };
  }
  return buildBlackstarComputerUsePlan(mapped, {
    allowedDomains,
    maximumSteps: Math.min(30, Math.max(1, mapped.length)),
    allowTyping: true,
    allowFormFill: true,
    allowClicks: true,
    allowStorageState: false,
    requireApprovalForMutations: false,
  });
}
