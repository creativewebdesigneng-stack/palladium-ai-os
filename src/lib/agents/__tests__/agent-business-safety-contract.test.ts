import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const tools = readFileSync(new URL("../../runtime/tools-core.server.ts", import.meta.url), "utf8");
const connected = readFileSync(new URL("../../integrations/connected-service.server.ts", import.meta.url), "utf8");
const approvals = readFileSync(new URL("../../mission/external-action-approval.functions.ts", import.meta.url), "utf8");
const emailApproval = readFileSync(new URL("../../mission/email-approval.functions.ts", import.meta.url), "utf8");
const trading = readFileSync(new URL("../../trading/trading-ai.functions.ts", import.meta.url), "utf8");
const tradingWorkspace = readFileSync(new URL("../../trading/trading-workspace.functions.ts", import.meta.url), "utf8");
const quant = readFileSync(new URL("../../quant/quant-studio.functions.ts", import.meta.url), "utf8");

describe("Blackstar business capability safety contract", () => {
  it("keeps browser operation domain-bounded and unable to pay", () => {
    expect(tools).toContain("Cannot pay for anything");
    expect(tools).toContain("That domain is not on this agent’s allow-list.");
    expect(tools).toContain("DOMAIN_SCOPED");
    expect(tools).toContain('"browser_task"');
  });

  it("keeps connected-service discovery read-only and queues writes for approval", () => {
    expect(connected).toContain("Read-only dispatcher for user-connected services");
    expect(connected).toContain("OAuth tokens and GitHub App installation tokens are resolved server-side");
    expect(tools).toContain("connected_service_write");
    expect(tools).toContain("The exact approved payload is stored with this request and cannot be changed during retry.");
    expect(tools).toContain("nango_dynamic_action");
  });

  it("requires a single-use human approval claim before connected writes execute", () => {
    expect(approvals).toContain("single-use guard against double-click/two-tab duplicate writes");
    expect(approvals).toContain('.eq("status", "pending")');
    expect(approvals).toContain('execution_status: "executing"');
    expect(approvals).toContain("Retry claims only the already-approved immutable request payload");
  });

  it("does not autonomously send approved email work from the draft path", () => {
    expect(emailApproval).toContain("draft_created");
    expect(emailApproval).toContain("It has not been sent.");
  });

  it("prepares purchases without authorising payment", () => {
    expect(tools).toContain("Prepare a purchase for the operator to approve");
    expect(tools).toContain("Does not pay.");
    expect(tools).toContain("payment_authorised: false");
    expect(tools).toContain("No money has moved.");
  });

  it("keeps trading intelligence research-only and prohibits execution claims", () => {
    expect(trading).toContain("Do not place or imply that you placed an order.");
    expect(trading).toContain("Research and risk analysis are separate from execution.");
    expect(trading).toContain("This is general research, not personalised investment advice.");
    expect(tradingWorkspace).toContain("trading_simulations");
  });

  it("keeps quant strategies explicitly research-only", () => {
    expect(quant).toContain("execution: 'research-only'");
    expect(quant).toContain("At least two real historical return observations are required");
  });
});
