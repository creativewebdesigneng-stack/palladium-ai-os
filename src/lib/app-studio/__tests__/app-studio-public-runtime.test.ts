import { describe, expect, it } from "vitest";
import {
  interpretPublicStudioEvent,
  resolvePublicStudioBinding,
  resolvePublicWidgetProperties,
} from "../app-studio-public-runtime";

describe("published App Studio runtime", () => {
  it("resolves bounded page and query bindings without evaluating JavaScript", () => {
    const context = {
      app: { user: null, environment: "published" },
      page: { name: "Orders", params: { order: "123" } },
      queries: { orders: { data: { rows: [{ total: 42 }] } } },
    };
    expect(resolvePublicStudioBinding("{{ page.name }}", context)).toBe("Orders");
    expect(resolvePublicStudioBinding("{{ page.params.order }}", context)).toBe("123");
    expect(resolvePublicStudioBinding("{{ queries.orders.data.rows[0].total }}", context)).toBe(42);
    expect(resolvePublicStudioBinding("{{ globalThis.fetch('https://bad.test') }}", context)).toBe("{{ globalThis.fetch('https://bad.test') }}");
    expect(resolvePublicWidgetProperties({ text: "fallback" }, { text: "{{ page.name }}" }, context)).toEqual({ text: "Orders" });
  });

  it("supports local interactions and navigation", () => {
    expect(interpretPublicStudioEvent({ type: "navigate", pageId: "orders" })).toEqual({ type: "navigate", pageId: "orders" });
    expect(interpretPublicStudioEvent({ type: "open_modal", modalId: "confirm" })).toEqual({ type: "open_modal", modalId: "confirm" });
    expect(interpretPublicStudioEvent({ type: "close_modal", modalId: "confirm" })).toEqual({ type: "close_modal", modalId: "confirm" });
    expect(interpretPublicStudioEvent({ type: "set_value", target: "email", value: "a@example.test" })).toEqual({ type: "set_value", target: "email", value: "a@example.test" });
  });

  it("does not give anonymous published apps owner-scoped query authority", () => {
    expect(interpretPublicStudioEvent({ type: "run_query", queryId: "private-query" })).toEqual({ type: "run_query_blocked", queryId: "private-query" });
  });
});
