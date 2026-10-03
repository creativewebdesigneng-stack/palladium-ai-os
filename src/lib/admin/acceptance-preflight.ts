export type OperationalProbeKind = "cinema" | "three-d";

export type OperationalProbeSummary = {
  kind: OperationalProbeKind;
  name: string;
  provider: string;
  configured: boolean;
  reachable: boolean;
  healthy: boolean;
  readySignal: boolean | null;
  httpStatus: number | null;
  latencyMs: number | null;
  checkedAt: string | null;
  error: string | null;
};

function safeText(value: unknown, fallback: string, max = 120) {
  if (typeof value !== "string") return fallback;
  const text = value.trim();
  return text ? text.slice(0, max) : fallback;
}

function safeStatus(value: unknown) {
  const status = Number(value);
  return Number.isInteger(status) && status >= 100 && status <= 599 ? status : null;
}

function safeLatency(value: unknown) {
  const latency = Number(value);
  return Number.isFinite(latency) && latency >= 0 ? Math.floor(latency) : null;
}

function safeCheckedAt(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

export function normalizeOperationalProbe(
  kind: OperationalProbeKind,
  value: unknown,
): OperationalProbeSummary {
  const probe = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};

  const defaultName = kind === "cinema"
    ? "Cinema master worker"
    : "3D Studio worker";

  return {
    kind,
    name: safeText(probe['name'], defaultName, 80),
    provider: safeText(probe['provider'], "unknown", 80),
    configured: probe['configured'] === true,
    reachable: probe['reachable'] === true,
    healthy: probe['healthy'] === true,
    readySignal: typeof probe['readySignal'] === "boolean" ? probe['readySignal'] : null,
    httpStatus: safeStatus(probe['httpStatus']),
    latencyMs: safeLatency(probe['latencyMs']),
    checkedAt: safeCheckedAt(probe['checkedAt']),
    error: typeof probe['error'] === "string" && probe['error'].trim()
      ? probe['error'].trim().slice(0, 240)
      : null,
  };
}

export function operationalProbeLabel(probe: OperationalProbeSummary) {
  if (!probe['configured']) return "Not configured";
  if (!probe['reachable']) return "Unreachable";
  if (!probe['healthy']) return "Needs attention";
  return "Ready";
}
