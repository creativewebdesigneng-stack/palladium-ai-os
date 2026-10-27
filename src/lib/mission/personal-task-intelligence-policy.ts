/** Bounded Personal AI task depth, reusing the existing Mission Control runtime.
 *
 * This is not an authority/permissions source: tool grants, approvals and
 * domain policy continue to be enforced by the ordinary tool executor.
 */
export const MAX_PERSONAL_TOOL_CALLS = 12;
export const DEFAULT_PERSONAL_TOOL_ROUNDS = 4;
export const COMPLEX_PERSONAL_TOOL_ROUNDS = 6;

const COMPLEX_TASK_SIGNAL = /\b(?:multi[\s-]?step|multiple\s+steps|step\s+by\s+step|several\s+(?:pages|sources|sites|steps)|compare\s+(?:sources|sites|pages)|research\s+(?:and|then)|navigate\s+(?:and|then)|then\s+(?:read|extract|compare|summari[sz]e)|cross[\s-]?check|verify\s+(?:the|each|multiple)|analyse\s+(?:and|then)|analy[sz]e\s+(?:and|then))\b/i;

/** Preserve the existing 4-round behaviour for ordinary single-step tasks.
 * Explicit multi-step requests and multi-capability jobs get two more bounded
 * iterations, avoiding an unbounded agent loop on a consumer GPU.
 */
export function personalTaskToolRoundLimit(request: string, requiredTools: readonly string[]): number {
  const distinct = new Set(requiredTools.map((tool) => tool.trim()).filter(Boolean));
  return distinct.size > 1 || COMPLEX_TASK_SIGNAL.test(request)
    ? COMPLEX_PERSONAL_TOOL_ROUNDS
    : DEFAULT_PERSONAL_TOOL_ROUNDS;
}

function isEnabled(value: string | undefined): boolean {
  return /^(?:true|1|yes|on)$/i.test(value?.trim() ?? "");
}

/** Exact native-primary model identity is pinned to its configured compatible
 * transport. A Qwen task cannot silently become a paid or differently-owned
 * provider call when the home gateway has a transient failure.
 */
export function shouldPinBlackstarNativeTask(
  provider: string,
  model: string,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return provider === "compatible"
    && isEnabled(env["BLACKSTAR_NATIVE_PRIMARY"])
    && Boolean(env["OPENAI_COMPATIBLE_BASE_URL"]?.trim())
    && Boolean(env["BLACKSTAR_NATIVE_MODEL"]?.trim())
    && model === env["BLACKSTAR_NATIVE_MODEL"]?.trim();
}
