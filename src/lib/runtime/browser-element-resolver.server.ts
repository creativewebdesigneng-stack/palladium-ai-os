export type BrowserInteractiveItem = {
  selector?: unknown;
  tag?: unknown;
  role?: unknown;
  type?: unknown;
  text?: unknown;
  label?: unknown;
  disabled?: unknown;
};

const clean = (value: unknown, max = 500) =>
  (typeof value === "string" ? value : "").replace(/\s+/g, " ").trim().slice(0, max);

function tokens(value: string) {
  return [...new Set(value.toLowerCase().split(/[^a-z0-9]+/).filter((part) => part.length > 1))];
}

function actionCompatible(item: BrowserInteractiveItem, action: "click" | "type") {
  const tag = clean(item.tag, 30).toLowerCase();
  const role = clean(item.role, 40).toLowerCase();
  const type = clean(item.type, 40).toLowerCase();
  if (item.disabled === true) return false;
  if (action === "type") {
    return tag === "input" || tag === "textarea" || tag === "select" || role === "textbox" || role === "combobox";
  }
  return tag === "button" || tag === "a" || role === "button" || role === "link" || role === "checkbox" || role === "radio" || type === "submit" || type === "button";
}

function scoreItem(item: BrowserInteractiveItem, query: string, action: "click" | "type") {
  if (!actionCompatible(item, action)) return -1;
  const label = clean(item.label).toLowerCase();
  const visibleText = clean(item.text).toLowerCase();
  const haystack = `${label} ${visibleText}`.trim();
  const needle = query.toLowerCase();
  if (!haystack) return 0;
  let score = 0;
  if (label === needle) score += 100;
  if (visibleText === needle) score += 90;
  if (label.includes(needle)) score += 55;
  if (visibleText.includes(needle)) score += 45;
  const queryTokens = tokens(needle);
  const matched = queryTokens.filter((part) => haystack.includes(part)).length;
  score += matched * 12;
  if (queryTokens.length && matched === queryTokens.length) score += 20;
  return score;
}

/**
 * Resolve a human label against the bounded interactive element map returned by
 * the trusted browser worker. Ambiguous matches fail closed rather than clicking
 * the wrong real-world control.
 */
export function resolveBrowserElementSelector(
  items: unknown,
  label: string,
  action: "click" | "type",
): { selector: string; score: number } {
  const query = clean(label, 200);
  if (!query) throw new Error(`${action} requires a selector or element label.`);
  if (!Array.isArray(items)) throw new Error("The browser did not return an interactive element map.");

  const ranked = items
    .map((item) => {
      const row = item && typeof item === "object" ? (item as BrowserInteractiveItem) : {};
      return { row, selector: clean(row.selector, 1000), score: scoreItem(row, query, action) };
    })
    .filter((candidate) => candidate.selector && candidate.score > 0)
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best) throw new Error(`No visible ${action === "type" ? "field" : "control"} matched the label "${query}".`);
  const runnerUp = ranked[1];
  if (runnerUp && runnerUp.score === best.score && runnerUp.selector !== best.selector) {
    throw new Error(`The element label "${query}" matched multiple controls equally; provide a selector or a more specific label.`);
  }
  return { selector: best.selector, score: best.score };
}
