import { describe, expect, it } from "vitest";
import { validateStudioBindings, validateStudioEvents } from "../app-studio-bindings";

describe("App Studio binding policy", () => {
  it("accepts bounded declarative references", () => {
    expect(validateStudioBindings({ text: "{{ queries.getOrders.data.items[0].name }}"})).toEqual({ text: "{{ queries.getOrders.data.items[0].name }}" });
    expect(validateStudioEvents({ onClick: { type: "run_query", queryId: "123", input: {} } })).toEqual({ onClick: { type: "run_query", queryId: "123", input: {} } });
  });

  it("rejects arbitrary JavaScript and unsupported side effects", () => {
    expect(() => validateStudioBindings({ text: "{{ globalThis.fetch('https://bad.test') }}" })).toThrow(/arbitrary JavaScript/);
    expect(() => validateStudioBindings({ text: "{{ queries.x.data.constructor }}" })).not.toThrow();
    expect(() => validateStudioEvents({ onClick: { type: "eval", value: "alert(1)" } })).toThrow(/not supported/);
    expect(() => validateStudioEvents({ onclick: { type: "navigate" } })).toThrow(/event name/);
  });
});
