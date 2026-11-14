import { ProviderError } from "./model-gateway.base";

export type AstraNativeFailureCode =
  | "cancelled"
  | "authentication"
  | "quota"
  | "connection"
  | "timeout"
  | "model_missing"
  | "context_overflow"
  | "out_of_memory"
  | "empty_output"
  | "provider";

export type AstraNativeRecovery = {
  code: AstraNativeFailureCode;
  /** retry: one more local attempt. fallback: leave the local runtime. fail: stop. */
  action: "retry" | "fallback" | "fail";
};

function networkMessage(error: Error): boolean {
  return /fetch failed|network|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNRESET|socket/i.test(
    error.message,
  );
}

/**
 * Classifies a local inference failure. Quota and connection failures fall
 * over to another configured provider. Cancellation never does. The same
 * provider is not retried for quota.
 */
export function classifyAstraNativeFailure(error: unknown): AstraNativeRecovery {
  if (error instanceof ProviderError) {
    if (error.status === 499) return { code: "cancelled", action: "fail" };
    if (error.status === 401 || error.status === 403)
      return { code: "authentication", action: "fallback" };
    if (error.status === 402) return { code: "quota", action: "fallback" };
    if (error.status === 404) return { code: "model_missing", action: "fallback" };
    if (error.status === 408 || error.status === 504)
      return { code: "timeout", action: "fallback" };
    if (
      error.status === 413 ||
      (error.status === 400 && /context|maximum context|token/i.test(error.message))
    ) {
      return { code: "context_overflow", action: "fallback" };
    }
    if (/out of memory|cuda out of memory|\boom\b/i.test(error.message)) {
      return { code: "out_of_memory", action: "fallback" };
    }
    if (error.status >= 500 || error.status === 429)
      return { code: "provider", action: "fallback" };
    return { code: "provider", action: "fallback" };
  }
  if (error instanceof Error && error.name === "AbortError")
    return { code: "cancelled", action: "fail" };
  if (error instanceof Error && networkMessage(error))
    return { code: "connection", action: "fallback" };
  return { code: "provider", action: "fallback" };
}
