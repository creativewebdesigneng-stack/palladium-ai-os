/**
 * Memory privacy policy.
 *
 * Automatic capture is the only path an agent can write memory without the user
 * asking, so every automatic write passes through here first. The user's stored
 * preferences decide whether a layer may be written at all, how long it lives,
 * and whether sensitive detail is allowed to be persisted. Sensitive text is
 * redacted (not silently stored) unless the user explicitly opted in.
 */

type Sb = { from: (t: string) => any };

export type MemoryPreferences = {
  auto_capture: boolean;
  capture_sensitive: boolean;
  short_term_enabled: boolean;
  long_term_enabled: boolean;
  document_memory_enabled: boolean;
  organisation_sharing_enabled: boolean;
  short_term_ttl_minutes: number;
  retention_days: number | null;
};

export const DEFAULT_MEMORY_PREFERENCES: MemoryPreferences = {
  auto_capture: true,
  capture_sensitive: false,
  short_term_enabled: true,
  long_term_enabled: true,
  document_memory_enabled: true,
  organisation_sharing_enabled: false,
  short_term_ttl_minutes: 720,
  retention_days: null,
};

/** Reads the caller's preferences; absent rows mean "the safe defaults". */
export async function loadMemoryPreferences(sb: Sb, userId: string): Promise<MemoryPreferences> {
  const { data } = await sb
    .from("memory_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return { ...DEFAULT_MEMORY_PREFERENCES };
  return {
    auto_capture: data.auto_capture !== false,
    capture_sensitive: data.capture_sensitive === true,
    short_term_enabled: data.short_term_enabled !== false,
    long_term_enabled: data.long_term_enabled !== false,
    document_memory_enabled: data.document_memory_enabled !== false,
    organisation_sharing_enabled: data.organisation_sharing_enabled === true,
    short_term_ttl_minutes: Number(data.short_term_ttl_minutes ?? 720),
    retention_days: data.retention_days == null ? null : Number(data.retention_days),
  };
}

export async function saveMemoryPreferences(
  sb: Sb,
  userId: string,
  patch: Partial<MemoryPreferences>,
): Promise<MemoryPreferences> {
  const row: Record<string, unknown> = { user_id: userId };
  const bools = [
    "auto_capture",
    "capture_sensitive",
    "short_term_enabled",
    "long_term_enabled",
    "document_memory_enabled",
    "organisation_sharing_enabled",
  ] as const;
  for (const key of bools) if (patch[key] !== undefined) row[key] = Boolean(patch[key]);
  if (patch.short_term_ttl_minutes !== undefined) {
    row["short_term_ttl_minutes"] = Math.min(
      Math.max(Number(patch.short_term_ttl_minutes) || 720, 15),
      60 * 24 * 30,
    );
  }
  if (patch.retention_days !== undefined) {
    const days = patch.retention_days == null ? null : Number(patch.retention_days);
    row["retention_days"] =
      days == null || !Number.isFinite(days) || days <= 0 ? null : Math.min(days, 3650);
  }

  const { data, error } = await sb
    .from("memory_preferences")
    .upsert(row, { onConflict: "user_id" })
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return loadMemoryPreferences(sb, userId).catch(() => ({
    ...DEFAULT_MEMORY_PREFERENCES,
    ...(data ?? {}),
  }));
}

/* ------------------------------------------------------------ sensitive text */

/**
 * Patterns for detail we refuse to persist automatically: payment instruments,
 * government identifiers, credentials and direct contact details. Health and
 * financial keywords are treated as sensitive categories rather than redacted
 * spans, because the whole memory is withheld in that case.
 */
const SENSITIVE_PATTERNS: Array<{ label: string; re: RegExp }> = [
  { label: "card number", re: /\b(?:\d[ -]*?){13,19}\b/g },
  { label: "security code", re: /\b(?:cvv|cvc|security code)\s*[:=]?\s*\d{3,4}\b/gi },
  { label: "sort code", re: /\b\d{2}-\d{2}-\d{2}\b/g },
  { label: "IBAN", re: /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g },
  { label: "national insurance number", re: /\b[A-CEGHJ-PR-TW-Z]{2}\d{6}[A-D]\b/gi },
  { label: "email address", re: /\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g },
  { label: "phone number", re: /\b(?:\+?\d[\d ()-]{8,17}\d)\b/g },
  { label: "credential", re: /\b(?:password|api[_ -]?key|secret|token)\s*[:=]\s*\S+/gi },
];

const SENSITIVE_CATEGORY_HINTS =
  /\b(?:diagnos|prescription|medication|symptom|mental health|therapy|blood pressure|salary|bank balance|mortgage|debt|criminal|immigration|religio|sexual|ethnic)\w*/i;

export type SanitizeResult = {
  /** Cleaned content, or null when the memory must not be stored at all. */
  content: string | null;
  redacted: string[];
  blockedReason?: string;
};

/**
 * Applies the user's sensitivity choice to content about to be captured
 * automatically. With `capture_sensitive` off, identifiers are replaced with
 * placeholders and health/finance-style personal disclosures are dropped
 * entirely rather than stored in a weaker form.
 */
export function sanitizeForCapture(content: string, prefs: MemoryPreferences): SanitizeResult {
  if (prefs.capture_sensitive) return { content, redacted: [] };

  if (SENSITIVE_CATEGORY_HINTS.test(content)) {
    return {
      content: null,
      redacted: [],
      blockedReason:
        "This looked like sensitive personal information, so it was not remembered. Turn on sensitive memory in Settings if you want agents to keep details like this.",
    };
  }

  const redacted: string[] = [];
  let out = content;
  for (const { label, re } of SENSITIVE_PATTERNS) {
    out = out.replace(re, (match) => {
      // Short digit runs (years, quantities, prices) are not identifiers.
      if (label !== "credential" && match.replace(/\D/g, "").length < 9 && /^\D*\d/.test(match))
        return match;
      if (!redacted.includes(label)) redacted.push(label);
      return `[${label} removed]`;
    });
  }
  const trimmed = out.trim();
  return { content: trimmed ? trimmed : null, redacted };
}

/** Decides whether an automatic write of this layer is permitted at all. */
export function capturePermitted(
  memoryType: string,
  prefs: MemoryPreferences,
): { ok: boolean; reason?: string } {
  if (!prefs.auto_capture)
    return { ok: false, reason: "Automatic memory is switched off in your memory settings." };
  if (memoryType === "short_term" && !prefs.short_term_enabled)
    return { ok: false, reason: "Short-term memory is switched off." };
  if (memoryType === "long_term" && !prefs.long_term_enabled)
    return { ok: false, reason: "Long-term memory is switched off." };
  if (memoryType === "knowledge" && !prefs.document_memory_enabled)
    return { ok: false, reason: "Document memory is switched off." };
  if (memoryType === "organisation" && !prefs.organisation_sharing_enabled)
    return { ok: false, reason: "Organisation memory sharing is switched off." };
  return { ok: true };
}

/** Expiry for a memory layer under the user's retention choice. */
export function expiryFor(
  memoryType: string,
  prefs: MemoryPreferences,
  explicitTtlMinutes?: number | null,
): string | null {
  if (explicitTtlMinutes) return new Date(Date.now() + explicitTtlMinutes * 60_000).toISOString();
  if (memoryType === "short_term")
    return new Date(Date.now() + prefs.short_term_ttl_minutes * 60_000).toISOString();
  if (prefs.retention_days)
    return new Date(Date.now() + prefs.retention_days * 86_400_000).toISOString();
  return null;
}
