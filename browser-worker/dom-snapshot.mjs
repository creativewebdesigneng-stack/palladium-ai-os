export const MAX_INTERACTIVE_ITEMS = 120;

const clean = (value, max) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

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
    const href = clean(raw.href, 1200);
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
