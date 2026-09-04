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

  return buildBlackstarComputerUsePlan(steps, {
    allowedDomains,
    maximumSteps,
    allowTyping: true,
    allowFormFill: false,
    allowClicks: true,
    allowStorageState: false,
    // The existing ToolGrant/approval_requests boundary remains authoritative;
    // this preflight must not create a second approval lifecycle.
    requireApprovalForMutations: false,
  });
}
