import { describe, expect, it } from "vitest";
import { canonicalBlackstarAgentId, evaluateAgentDelegation, type AgentDelegationGrant } from "../agent-trust";

const grant: AgentDelegationGrant = {
  id: "grant-1",
  grantor_agent_id: "agent-a",
  grantee_agent_id: "agent-b",
  scopes: ["research", "workflow.execute"],
  max_hops: 1,
  requires_approval: false,
  allow_external_actions: false,
  status: "active",
  expires_at: "2026-09-05T00:00:00.000Z",
};

const now = new Date("2026-09-04T12:00:00.000Z");

describe("Blackstar agent trust policy", () => {
  it("creates a stable canonical Blackstar identity", () => {
    expect(canonicalBlackstarAgentId("00000000-0000-0000-0000-000000000001")).toBe(
      "urn:blackstar:agent:00000000-0000-0000-0000-000000000001",
    );
  });

  it("allows an in-scope internal delegation", () => {
    expect(
      evaluateAgentDelegation(
        grant,
        { grantorAgentId: "agent-a", granteeAgentId: "agent-b", scope: "research", hop: 1 },
        now,
      ),
    ).toMatchObject({ allowed: true, requiresApproval: false, grantId: "grant-1" });
  });

  it("denies scopes that were not explicitly delegated", () => {
    expect(
      evaluateAgentDelegation(
        grant,
        { grantorAgentId: "agent-a", granteeAgentId: "agent-b", scope: "payments.execute", hop: 1 },
        now,
      ).allowed,
    ).toBe(false);
  });

  it("denies external actions unless the grant explicitly permits them", () => {
    expect(
      evaluateAgentDelegation(
        grant,
        {
          grantorAgentId: "agent-a",
          granteeAgentId: "agent-b",
          scope: "research",
          hop: 1,
          externalAction: true,
        },
        now,
      ).reason,
    ).toContain("External actions");
  });

  it("denies expired and over-depth delegation", () => {
    expect(
      evaluateAgentDelegation(
        grant,
        { grantorAgentId: "agent-a", granteeAgentId: "agent-b", scope: "research", hop: 2 },
        now,
      ).allowed,
    ).toBe(false);
    expect(
      evaluateAgentDelegation(
        { ...grant, expires_at: "2026-09-03T00:00:00.000Z" },
        { grantorAgentId: "agent-a", granteeAgentId: "agent-b", scope: "research", hop: 1 },
        now,
      ).allowed,
    ).toBe(false);
  });

  it("keeps explicitly approval-gated grants approval-gated", () => {
    expect(
      evaluateAgentDelegation(
        { ...grant, requires_approval: true },
        { grantorAgentId: "agent-a", granteeAgentId: "agent-b", scope: "research", hop: 0 },
        now,
      ),
    ).toMatchObject({ allowed: true, requiresApproval: true });
  });
});
