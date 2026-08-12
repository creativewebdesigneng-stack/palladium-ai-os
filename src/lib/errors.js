/**
 * Shared user-facing error mapping.
 *
 * Backend failures are logged with their technical detail and shown to people
 * as plain language. Raw database errors (Postgres codes, PostgREST payloads,
 * RLS messages) must never reach the UI.
 */

const PATTERNS = [
  [
    /row-level security|permission denied|not authorised|not authorized|forbidden/i,
    "You do not have permission to do that.",
  ],
  [
    /unauthori[sz]ed|jwt|invalid token|no session|sign in/i,
    "Your session has expired. Please sign in again.",
  ],
  [/duplicate key|already exists|unique constraint/i, "That already exists."],
  [
    /violates foreign key|not present in table/i,
    "Something it depends on is missing. Refresh and try again.",
  ],
  [/plan|limit reached|quota|upgrade/i, null], // entitlement errors are already friendly
  [
    /failed to fetch|network|timeout|aborted/i,
    "We could not reach the server. Check your connection and try again.",
  ],
  [
    /relation .* does not exist|column .* does not exist|syntax error|pgrst|postgres/i,
    "Something went wrong on our side. Please try again.",
  ],
];

/** A safe, human sentence for any thrown value. */
export function friendlyMessage(error, fallback = "Something went wrong. Please try again.") {
  const raw = typeof error === "string" ? error : (error?.message ?? "");
  if (!raw) return fallback;
  for (const [pattern, message] of PATTERNS) {
    if (pattern.test(raw)) return message ?? raw;
  }
  // Server functions in this app throw curated messages; keep short ones.
  if (raw.length <= 160 && !/\bat\b .*\(|\{|\}/.test(raw)) return raw;
  return fallback;
}

/** Logs the technical detail for engineers and returns the safe message. */
export function reportError(scope, error, fallback) {
  console.error(`[${scope}]`, error);
  return friendlyMessage(error, fallback);
}
