const BINDING = /^\{\{\s*(?:queries\.[A-Za-z][A-Za-z0-9_]*\.data|app\.(?:user|environment)|page\.(?:params|name))(?:\.[A-Za-z0-9_]+|\[\d+\])*\s*\}\}$/;
const EVENTS = new Set(["run_query", "navigate", "open_modal", "close_modal", "set_value"]);

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function validateStudioBindings(value: unknown): Record<string, unknown> {
  const bindings = object(value);
  if (Object.keys(bindings).length > 50) throw new Error("A component can have at most 50 bindings.");
  for (const [property, expression] of Object.entries(bindings)) {
    if (!/^[A-Za-z][A-Za-z0-9_.-]{0,79}$/.test(property)) throw new Error("A component binding property is invalid.");
    if (typeof expression !== "string" || expression.length > 500 || !BINDING.test(expression)) {
      throw new Error("Bindings must be bounded App Studio references; arbitrary JavaScript is not allowed.");
    }
  }
  return bindings;
}

export function validateStudioEvents(value: unknown): Record<string, unknown> {
  const events = object(value);
  if (Object.keys(events).length > 20) throw new Error("A component can have at most 20 events.");
  for (const [eventName, definition] of Object.entries(events)) {
    if (!/^on[A-Z][A-Za-z0-9]{1,39}$/.test(eventName)) throw new Error("A component event name is invalid.");
    const event = object(definition);
    if (!EVENTS.has(String(event["type"] ?? ""))) throw new Error("That App Studio event action is not supported.");
    if (JSON.stringify(event).length > 4000) throw new Error("An App Studio event definition is too large.");
    for (const key of Object.keys(event)) {
      if (!["type","queryId","pageId","modalId","target","value","input"].includes(key)) {
        throw new Error("That App Studio event field is not supported.");
      }
    }
  }
  return events;
}
