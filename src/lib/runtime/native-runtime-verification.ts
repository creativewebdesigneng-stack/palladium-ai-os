export const BLACKSTAR_NATIVE_VERIFICATION_MARKER = "BLACKSTAR_GPU_OK";
export const BLACKSTAR_NATIVE_VERIFICATION_TIMEOUT_MS = 60_000;
export const BLACKSTAR_NATIVE_VERIFICATION_MAX_TOKENS = 96;

export type NativeVerificationTarget = {
  configured: boolean;
  provider: "compatible";
  model: string | null;
  reason: string | null;
};

function enabled(value?: string): boolean {
  const normalised = value?.trim().toLowerCase();
  return normalised === "1" || normalised === "true" || normalised === "yes" || normalised === "on";
}

export function resolveNativeVerificationTarget(env: NodeJS.ProcessEnv = process.env): NativeVerificationTarget {
  const nativePrimary = enabled(env["BLACKSTAR_NATIVE_PRIMARY"]);
  const baseUrl = env["OPENAI_COMPATIBLE_BASE_URL"]?.trim();
  const model = env["BLACKSTAR_NATIVE_MODEL"]?.trim();

  if (!nativePrimary) {
    return { configured: false, provider: "compatible", model: model || null, reason: "Blackstar native-primary routing is not enabled on this deployment." };
  }
  if (!baseUrl) {
    return { configured: false, provider: "compatible", model: model || null, reason: "No Blackstar OpenAI-compatible native endpoint is configured." };
  }
  if (!model) {
    return { configured: false, provider: "compatible", model: null, reason: "BLACKSTAR_NATIVE_MODEL is not configured on this deployment." };
  }

  return { configured: true, provider: "compatible", model, reason: null };
}

export function nativeVerificationPrompt(): string {
  return `/no_think\nReply with exactly ${BLACKSTAR_NATIVE_VERIFICATION_MARKER}`;
}

export function normaliseNativeVerificationResponse(value: string): string {
  return value
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^```(?:text)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .trim();
}

export function isNativeVerificationMarker(value: string): boolean {
  return normaliseNativeVerificationResponse(value) === BLACKSTAR_NATIVE_VERIFICATION_MARKER;
}
