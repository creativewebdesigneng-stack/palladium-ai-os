/** Bounded, syntactically valid tool evidence for Blackstar Personal AI.
 *
 * Truncating JSON with String.slice leaves malformed results in long research
 * and browser tasks. Keep a parseable envelope, provenance and page identity
 * while limiting how much untrusted tool content enters the model context.
 */
export const PERSONAL_TOOL_EVIDENCE_CHARS = 8000;

function brief(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.slice(0, 512) : undefined;
}

function provenance(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  const result = record["result"];
  const resultRecord = result && typeof result === "object" && !Array.isArray(result)
    ? (result as Record<string, unknown>)
    : null;
  const source: Record<string, unknown> = {};
  const provider = brief(record["provider"]);
  if (provider) source["provider"] = provider;
  if (typeof record["simulated"] === "boolean") source["simulated"] = record["simulated"];
  if (resultRecord) {
    const page: Record<string, unknown> = {};
    const url = brief(resultRecord["url"]);
    if (url) page["url"] = url;
    if (typeof resultRecord["ok"] === "boolean") page["ok"] = resultRecord["ok"];
    if (Object.keys(page).length) source["result"] = page;
  }
  return source;
}

/** Returns valid JSON even when the original result is oversized or cyclic.
 * Excerpt is explicitly marked partial: the model must not infer that the
 * missing tail was searched or verified. Callers may still persist full
 * tool-execution evidence in their existing audit store.
 */
export function boundedPersonalToolEvidence(output: unknown): string {
  let encoded: string;
  try {
    encoded = JSON.stringify(output) ?? "null";
  } catch {
    return JSON.stringify({ error: "Tool result was not JSON-serializable; it cannot be used as verified evidence." });
  }
  if (encoded.length <= PERSONAL_TOOL_EVIDENCE_CHARS) return encoded;

  const base = {
    truncated: true,
    original_characters: encoded.length,
    ...provenance(output),
  };
  let excerpt = encoded.slice(0, 5200);
  let compact = JSON.stringify({ ...base, excerpt });
  // String escaping may expand heavily for quotes, newlines or \\ characters.
  // Reduce the excerpt until the final encoded envelope fits the hard cap.
  while (compact.length > PERSONAL_TOOL_EVIDENCE_CHARS && excerpt.length > 0) {
    excerpt = excerpt.slice(0, Math.floor(excerpt.length * 0.75));
    compact = JSON.stringify({ ...base, excerpt });
  }
  return compact;
}
