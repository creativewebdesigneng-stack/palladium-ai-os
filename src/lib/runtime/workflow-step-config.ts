export const SUPPORTED_WORKFLOW_STEP_KINDS = [
  "agent",
  "approval",
  "delay",
  "notification",
] as const;

export type SupportedWorkflowStepKind = (typeof SUPPORTED_WORKFLOW_STEP_KINDS)[number];

export function isSupportedWorkflowStepKind(value: unknown): value is SupportedWorkflowStepKind {
  return SUPPORTED_WORKFLOW_STEP_KINDS.includes(String(value).toLowerCase() as SupportedWorkflowStepKind);
}

export function assertSupportedWorkflowStepKind(value: unknown, label = "Workflow step"): SupportedWorkflowStepKind {
  const kind = String(value ?? "").trim().toLowerCase();
  if (!isSupportedWorkflowStepKind(kind)) {
    throw new Error(
      `${label} has unsupported kind "${kind || "empty"}". Supported kinds: ${SUPPORTED_WORKFLOW_STEP_KINDS.join(", ")}.`,
    );
  }
  return kind;
}

function jsonConfig(value: unknown, depth = 0): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || depth > 4) return {};
  const result: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value).slice(0, 40)) {
    if (!/^[a-zA-Z0-9_.-]{1,80}$/.test(key)) continue;
    if (raw == null || typeof raw === "boolean" || typeof raw === "number") result[key] = raw;
    else if (typeof raw === "string") result[key] = raw.slice(0, 2_000);
    else if (Array.isArray(raw))
      result[key] = raw
        .slice(0, 20)
        .filter((item) => typeof item === "string")
        .map(String);
    else if (typeof raw === "object") result[key] = jsonConfig(raw, depth + 1);
  }
  return result;
}

export function normaliseWorkflowStepConfig(kindValue: unknown, value: unknown): Record<string, unknown> {
  const kind = assertSupportedWorkflowStepKind(kindValue);
  const config = jsonConfig(value);
  if (kind === "delay") {
    if (
      !Number.isInteger(config["duration_ms"]) ||
      Number(config["duration_ms"]) < 0 ||
      Number(config["duration_ms"]) > 300_000
    ) {
      throw new Error("Delay duration_ms must be an integer between 0 and 300000.");
    }
  }
  return config;
}
