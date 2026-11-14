/**
 * Bounded retry for a single model round that has not dispatched tools.
 * Tool calls, approvals, cancellations and verification failures stay fail-closed.
 */

const TRANSIENT_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

export const MAX_TRANSIENT_MODEL_ATTEMPTS = 3;

export function isTransientModelFailure(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if (error instanceof Error && (error.name === "AbortError" || error.name === "RuntimeError"))
    return false;
  const row = error as { retryable?: unknown; status?: unknown; code?: unknown };
  if (
    typeof row.code === "string" &&
    ["CANCELLED", "RUN_TIMEOUT", "VERIFICATION_FAILED", "VERIFICATION_ESCALATION"].includes(
      row.code,
    )
  ) {
    return false;
  }
  if (row.retryable === false) return false;
  if (row.retryable === true) return true;
  const status = Number(row.status);
  return Number.isInteger(status) && TRANSIENT_STATUS.has(status);
}

/** Delay after a failed attempt. Attempt is 1-based. */
export function transientRetryDelayMs(failedAttempt: number): number {
  const step = Math.max(1, Math.min(MAX_TRANSIENT_MODEL_ATTEMPTS - 1, Math.floor(failedAttempt)));
  return 250 * 2 ** (step - 1);
}

export async function runModelRoundWithBoundedRetry<T>(args: {
  run: () => Promise<T>;
  isAborted?: () => boolean;
  delay?: (ms: number) => Promise<void>;
  maxAttempts?: number;
}): Promise<{ value: T; attempts: number }> {
  const maxAttempts = Math.min(
    MAX_TRANSIENT_MODEL_ATTEMPTS,
    Math.max(1, Math.floor(args.maxAttempts ?? MAX_TRANSIENT_MODEL_ATTEMPTS)),
  );
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (args.isAborted?.()) {
      throw lastError instanceof Error
        ? lastError
        : new Error("The model round was aborted before it could be retried.");
    }
    try {
      return { value: await args.run(), attempts: attempt };
    } catch (error) {
      lastError = error;
      const canRetry =
        attempt < maxAttempts && isTransientModelFailure(error) && !args.isAborted?.();
      if (!canRetry) throw error;
      if (args.delay) await args.delay(transientRetryDelayMs(attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("The model round failed.");
}
