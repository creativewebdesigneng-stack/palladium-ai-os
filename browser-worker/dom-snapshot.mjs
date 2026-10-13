export const MAX_INTERACTIVE_ITEMS = 120;

const clean = (value, max) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** Browser Use-style model-visible DOM maps must never carry URL tokens.
 * Click actions use the element selector instead of the returned href.
 */
export function safeObservedLink(raw) {
  if (typeof raw !== "string" || !raw.trim()) return "";
  try {
    const url = new URL(raw);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return "";
    url.search = "";
    url.hash = "";
    if (/\/(?:oauth|auth\/callback|reset-password|magic-link|invite|verify-email|confirm-email|password-reset)(?:\/|$)/i.test(url.pathname)) {
      return url.origin;
    }
    return clean(url.toString(), 1200);
  } catch {
    return "";
  }
}

/**
 * Reduces raw page element observations to a bounded, model-safe map. Values
 * typed into form fields are deliberately never accepted or returned here.
 */
export function normaliseInteractiveItems(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  const seen = new Set();
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const selector = clean(raw.selector, 1000);
    if (!selector || seen.has(selector)) continue;
    seen.add(selector);
    const tag = clean(raw.tag, 30).toLowerCase();
    const role = clean(raw.role, 50).toLowerCase();
    const type = clean(raw.type, 50).toLowerCase();
    const text = clean(raw.text, 300);
    const label = clean(raw.label, 300);
    const href = safeObservedLink(raw.href);
    out.push({
      selector,
      ...(tag ? { tag } : {}),
      ...(role ? { role } : {}),
      ...(type ? { type } : {}),
      ...(text ? { text } : {}),
      ...(label ? { label } : {}),
      ...(href ? { href } : {}),
      disabled: raw.disabled === true,
    });
    if (out.length >= MAX_INTERACTIVE_ITEMS) break;
  }
  return out;
}
