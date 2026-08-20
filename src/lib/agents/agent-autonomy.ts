export const AUTONOMY_LEVELS = [
  "assist",
  "prepare",
  "execute",
  "approval_required",
] as const;

export type AgentAutonomyLevel = (typeof AUTONOMY_LEVELS)[number];

/**
 * Normalise agent autonomy before it reaches the Postgres autonomy_level enum.
 * `supervised` is a legacy UI/server value and semantically maps to the
 * database-backed approval-required mode.
 */
export function normaliseAutonomyLevel(value?: string | null): AgentAutonomyLevel {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw || raw === "supervised") return "approval_required";
  if ((AUTONOMY_LEVELS as readonly string[]).includes(raw)) {
    return raw as AgentAutonomyLevel;
  }
  throw new Error("Unknown autonomy level");
}
