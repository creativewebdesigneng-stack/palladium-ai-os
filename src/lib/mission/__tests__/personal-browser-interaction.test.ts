import { beforeEach, describe, expect, it, vi } from "vitest";

const browser = vi.hoisted(() => ({
  createBrowserTool: vi.fn(),
  isDomainAllowed: vi.fn(),
  resolveBrowserProvider: vi.fn(),
  navigate: vi.fn(),
  click: vi.fn(),
  type: vi.fn(),
  close: vi.fn(),
}));

vi.mock("../browser-agent", () => ({
  createBrowserTool: browser.createBrowserTool,
  isDomainAllowed: browser.isDomainAllowed,
  resolveBrowserProvider: browser.resolveBrowserProvider,
}));

import { executeApprovedPersonalBrowserInteraction } from "../personal-browser-interaction.server";

function fakeSb() {
  const inserts: Array<Record<string, unknown>> = [];
  return {
    inserts,
    from(table: string) {
      return {
        insert(row: Record<string, unknown>) {
          inserts.push({ table, ...row });
          return Promise.resolve({ data: null, error: null });
        },
      };
    },
  };
}

describe("approved personal browser interaction", () => {
  beforeEach(() => {
    for (const fn of Object.values(browser)) fn.mockReset();
    browser.isDomainAllowed.mockReturnValue(true);
    browser.resolveBrowserProvider.mockReturnValue("playwright");
    browser.navigate.mockResolvedValue({ ok: true });
    browser.type.mockResolvedValue({ ok: true });
    browser.click.mockResolvedValue({ ok: true });
    browser.close.mockResolvedValue(undefined);
    browser.createBrowserTool.mockReturnValue({
      provider: "playwright",
      kind: "production",
      navigate: browser.navigate,
      type: browser.type,
      click: browser.click,
      close: browser.close,
    });
  });

  it("runs the approved type/click sequence in one browser session", async () => {
    const sb = fakeSb();
    const result = await executeApprovedPersonalBrowserInteraction({
      sb: sb as any,
      userId: "user-1",
      orgId: null,
      agentId: "agent-1",
      runId: "run-1",
      allowedDomains: ["example.com"],
      input: {
        url: "https://example.com/contact",
        steps: [
          { action: "type", selector: "#message", text: "Please contact me" },
          { action: "click", selector: "button[type=submit]" },
        ],
      },
    });

    expect(result).toMatchObject({
      ok: true,
      output: { provider: "playwright", simulated: false, steps_completed: 2, payment_authorised: false },
    });
    expect(browser.createBrowserTool).toHaveBeenCalledTimes(1);
    expect(browser.navigate).toHaveBeenCalledWith("https://example.com/contact");
    expect(browser.type).toHaveBeenCalledWith("#message", "Please contact me");
    expect(browser.click).toHaveBeenCalledWith("button[type=submit]");
    expect(browser.close).toHaveBeenCalledTimes(1);

    const audit = sb.inserts.find((row) => row["table"] === "tool_executions");
    expect(audit).toMatchObject({
      agent_task_id: "run-1",
      tool: "browser_interact",
      status: "succeeded",
    });
    expect(JSON.stringify(audit?.["input"])).not.toContain("Please contact me");
    expect(JSON.stringify(audit?.["input"])).toContain("text_chars");
  });

  it("refuses payment or checkout interactions before opening a browser", async () => {
    const sb = fakeSb();
    const result = await executeApprovedPersonalBrowserInteraction({
      sb: sb as any,
      userId: "user-1",
      orgId: null,
      agentId: "agent-1",
      runId: "run-1",
      allowedDomains: ["example.com"],
      input: {
        url: "https://example.com/checkout",
        steps: [{ action: "click", selector: "#pay-now" }],
      },
    });

    expect(result.ok).toBe(false);
    expect(JSON.stringify(result.output)).toContain("purchase approval flow");
    expect(browser.createBrowserTool).not.toHaveBeenCalled();
    expect(sb.inserts.some((row) => row["status"] === "failed")).toBe(true);
  });

  it("refuses URLs outside the agent allow-list", async () => {
    browser.isDomainAllowed.mockReturnValue(false);
    const sb = fakeSb();
    const result = await executeApprovedPersonalBrowserInteraction({
      sb: sb as any,
      userId: "user-1",
      orgId: null,
      agentId: "agent-1",
      runId: "run-1",
      allowedDomains: ["example.com"],
      input: {
        url: "https://other.example.net/form",
        steps: [{ action: "click", selector: "#continue" }],
      },
    });

    expect(result.ok).toBe(false);
    expect(JSON.stringify(result.output)).toContain("allow-list");
    expect(browser.createBrowserTool).not.toHaveBeenCalled();
  });
});
