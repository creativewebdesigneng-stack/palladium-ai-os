import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe("notification lifecycle", () => {
  it("expires a visible notification using the existing removal delay", async () => {
    const { toast } = await import("./use-toast");
    const { Toaster } = await import("./toaster");
    toast({ title: "Synthetic lifecycle check", description: "No external effect" });
    expect(renderToStaticMarkup(createElement(Toaster))).toContain("Synthetic lifecycle check");
    await vi.advanceTimersByTimeAsync(8000);
    expect(renderToStaticMarkup(createElement(Toaster))).not.toContain("Synthetic lifecycle check");
  });

  it("hides a dismissed notification immediately, before deferred cleanup", async () => {
    const { toast } = await import("./use-toast");
    const { Toaster } = await import("./toaster");
    const notification = toast({ title: "Dismiss this synthetic notification" });
    notification.dismiss();
    expect(renderToStaticMarkup(createElement(Toaster))).not.toContain("Dismiss this synthetic notification");
  });
});
