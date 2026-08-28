type PublicBindingContext = {
  app?: { user?: unknown; environment?: unknown };
  page?: { params?: Record<string, unknown>; name?: string };
  queries?: Record<string, { data?: unknown }>;
};

type StudioEvent = {
  type?: unknown;
  queryId?: unknown;
  pageId?: unknown;
  modalId?: unknown;
  target?: unknown;
  value?: unknown;
  input?: unknown;
};

const BINDING = /^\{\{\s*((?:queries\.[A-Za-z][A-Za-z0-9_]*\.data|app\.(?:user|environment)|page\.(?:params|name))(?:\.[A-Za-z0-9_]+|\[\d+\])*)\s*\}\}$/;
const SEGMENT = /\.([A-Za-z0-9_]+)|\[(\d+)\]/g;

function readPath(root: unknown, path: string): unknown {
  let current = root;
  SEGMENT.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SEGMENT.exec(path))) {
    const key = match[1] ?? match[2];
    if (key == null || key === "constructor" || key === "prototype" || key === "__proto__") return undefined;
    if (current == null || (typeof current !== "object" && !Array.isArray(current))) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

export function resolvePublicStudioBinding(expression: unknown, context: PublicBindingContext): unknown {
  if (typeof expression !== "string") return expression;
  const match = BINDING.exec(expression);
  if (!match?.[1]) return expression;
  const reference = match[1];

  if (reference.startsWith("queries.")) {
    const nameMatch = /^queries\.([A-Za-z][A-Za-z0-9_]*)\.data/.exec(reference);
    if (!nameMatch?.[1]) return undefined;
    const base = context.queries?.[nameMatch[1]]?.data;
    return readPath(base, reference.slice(nameMatch[0].length));
  }
  if (reference === "app.user") return context.app?.user;
  if (reference === "app.environment") return context.app?.environment;
  if (reference === "page.name") return context.page?.name;
  if (reference.startsWith("page.params")) {
    return readPath(context.page?.params ?? {}, reference.slice("page.params".length));
  }
  return undefined;
}

export function resolvePublicWidgetProperties(
  properties: unknown,
  bindings: unknown,
  context: PublicBindingContext,
): Record<string, unknown> {
  const base = properties && typeof properties === "object" && !Array.isArray(properties)
    ? { ...(properties as Record<string, unknown>) }
    : {};
  if (!bindings || typeof bindings !== "object" || Array.isArray(bindings)) return base;
  for (const [property, expression] of Object.entries(bindings as Record<string, unknown>)) {
    const value = resolvePublicStudioBinding(expression, context);
    if (value !== undefined) base[property] = value;
  }
  return base;
}

export type PublicStudioEventResult =
  | { type: "navigate"; pageId: string }
  | { type: "open_modal"; modalId: string }
  | { type: "close_modal"; modalId: string }
  | { type: "set_value"; target: string; value: unknown }
  | { type: "run_query_blocked"; queryId: string }
  | { type: "noop" };

export function interpretPublicStudioEvent(value: unknown): PublicStudioEventResult {
  const event = value && typeof value === "object" && !Array.isArray(value)
    ? value as StudioEvent
    : {};
  const type = typeof event.type === "string" ? event.type : "";
  const text = (candidate: unknown) => typeof candidate === "string" ? candidate.slice(0, 240) : "";

  if (type === "navigate") {
    const pageId = text(event.pageId) || text(event.target);
    return pageId ? { type, pageId } : { type: "noop" };
  }
  if (type === "open_modal" || type === "close_modal") {
    const modalId = text(event.modalId) || text(event.target);
    return modalId ? { type, modalId } : { type: "noop" };
  }
  if (type === "set_value") {
    const target = text(event.target);
    return target ? { type, target, value: event.value } : { type: "noop" };
  }
  if (type === "run_query") {
    const queryId = text(event.queryId);
    // Public releases intentionally do not inherit the owner's integration/MCP
    // identity. Query execution stays unavailable until a separately-scoped
    // public datasource capability is explicitly introduced.
    return queryId ? { type: "run_query_blocked", queryId } : { type: "noop" };
  }
  return { type: "noop" };
}
