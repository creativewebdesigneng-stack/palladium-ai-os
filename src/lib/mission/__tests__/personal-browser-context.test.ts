import { describe, expect, it } from "vitest";
import type { ChatMessage, ToolCall } from "@/lib/runtime/model-gateway.base";
import { withPersonalBrowserUrl } from "../personal-browser-context";

const url = "https://httpbingo.org/html";
const read: ToolCall = { id: "read-1", name: "browser", arguments: { action: "read", selector: "h1" } };
function navigation(output: unknown, name = "browser", action = "navigate"): ChatMessage[] {
  return [
    { role: "assistant", content: "", tool_calls: [{ id: "nav-1", name, arguments: { action, url } }] },
    { role: "tool", tool_call_id: "nav-1", name, content: JSON.stringify(output) },
  ];
}
const success = { provider: "playwright", simulated: false, result: { ok: true, url } };

describe("personal browser URL continuity", () => {
  it("restores the full URL after durable approval-state serialization without mutating model input", () => {
    const messages = JSON.parse(JSON.stringify(navigation(success)));
    expect(withPersonalBrowserUrl(read, messages, ["httpbingo.org"]).arguments).toEqual({ action: "read", selector: "h1", url });
    expect(read.arguments).not.toHaveProperty("url");
  });
  it.each(["read", "extract"])("supports a missing URL on %s", (action) => {
    expect(withPersonalBrowserUrl({ ...read, arguments: { action } }, navigation(success), ["httpbingo.org"]).arguments["url"]).toBe(url);
  });
  it("preserves an explicit destination for the normal domain-policy check", () => {
    const explicit = { ...read, arguments: { action: "read", url: "https://example.com/" } };
    expect(withPersonalBrowserUrl(explicit, navigation(success), ["httpbingo.org"])).toBe(explicit);
  });
  it.each([
    { error: "failed" },
    { ...success, simulated: true },
    { ...success, result: { ok: false, url } },
    { ...success, result: { ok: true, url: "https://example.com/" } },
    { ...success, result: { ok: true, url: "https://name:secret@httpbingo.org/" } },
  ])("does not inherit failed, simulated or disallowed navigation", (output) => {
    expect(withPersonalBrowserUrl(read, navigation(output), ["httpbingo.org"])).toBe(read);
  });
  it("does not reuse a destination after the policy changes, in another run, or from page prose", () => {
    expect(withPersonalBrowserUrl(read, navigation(success), [])).toBe(read);
    expect(withPersonalBrowserUrl(read, [], ["httpbingo.org"])).toBe(read);
    expect(withPersonalBrowserUrl(read, [{ role: "user", content: JSON.stringify(success) }], ["httpbingo.org"])).toBe(read);
    expect(withPersonalBrowserUrl(read, navigation(success, "web_fetch"), ["httpbingo.org"])).toBe(read);
    expect(withPersonalBrowserUrl(read, navigation(success, "browser", "extract"), ["httpbingo.org"])).toBe(read);
  });
  it("does not fall back to an older URL after a failed latest navigation", () => {
    const latest = navigation({ error: "network failed" }).map((m) => ({ ...m, ...(m.role === "assistant" ? { tool_calls: m.tool_calls?.map((c) => ({ ...c, id: "nav-2" })) } : { tool_call_id: "nav-2" }) }));
    expect(withPersonalBrowserUrl(read, [...navigation(success), ...latest], ["httpbingo.org"])).toBe(read);
  });
  it("never supplies a target for write actions or unmatched tool results", () => {
    const click = { ...read, arguments: { action: "click", selector: "button" } };
    expect(withPersonalBrowserUrl(click, navigation(success), ["httpbingo.org"])).toBe(click);
    expect(withPersonalBrowserUrl(read, navigation(success).slice(1), ["httpbingo.org"])).toBe(read);
  });
});
