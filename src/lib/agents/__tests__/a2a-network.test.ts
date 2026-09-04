import { describe, expect, it } from "vitest";
import { createAgentMessageEnvelope, resolveAgentNetworkRoute } from "../a2a-network";
import type { AgentDelegationGrant } from "../agent-trust";

const grants: AgentDelegationGrant[] = [
  {
    id: "grant-research",
    grantor_agent_id: "agent-a",
    grantee_agent_id: "agent-b",
    scopes: ["research.web"],
    max_hops: 1,
    requires_approval: false,
    allow_external_actions: false,
    status: "active",
  },
  {
    id: "grant-research-c",
    grantor_agent_id: "agent-a",
    grantee_agent_id: "agent-c",
    scopes: ["research.web"],
    max_hops: 1,
    requires_approval: true,
    allow_external_actions: false,
    status: "active",
  },
];

const passports = [
  {
    agent_id: "agent-b",
    canonical_id: "urn:blackstar:agent:b",
    status: "active",
    capabilities: ["research.web"],
    tool_scopes: ["browser.read"],
    provider_scopes: ["openai"],
    autonomy_tier: "autonomous",
    risk_tier: "low",
  },
  {
    agent_id: "agent-c",
    canonical_id: "urn:blackstar:agent:c",
    status: "active",
    capabilities: ["research.*"],
    tool_scopes: ["browser.read"],
    provider_scopes: ["*"],
    autonomy_tier: "guarded",
    risk_tier: "medium",
  },
];

describe("Blackstar A2A network", () => {
  it("routes to the strongest authorised capability match", () => {
    expect(
      resolveAgentNetworkRoute(
        {
          senderAgentId: "agent-a",
          capability: "research.web",
          toolScopes: ["browser.read"],
          providerScopes: ["openai"],
        },
        passports,
        grants,
      ),
    ).toMatchObject({
      recipientAgentId: "agent-b",
      grantId: "grant-research",
      requiresApproval: false,
    });
  });

  it("returns no route when Trust Fabric has not delegated the requested capability", () => {
    expect(resolveAgentNetworkRoute({ senderAgentId: "agent-a", capability: "payments.execute" }, passports, grants)).toBeNull();
  });

  it("respects requested tool scopes", () => {
    expect(
      resolveAgentNetworkRoute(
        { senderAgentId: "agent-a", capability: "research.web", toolScopes: ["browser.write"] },
        passports,
        grants,
      ),
    ).toBeNull();
  });

  it("creates bounded immutable-style message envelopes", () => {
    expect(
      createAgentMessageEnvelope(
        {
          id: "message-1",
          senderAgentId: "agent-a",
          recipientAgentId: "agent-b",
          scope: "research.web",
          kind: "request",
          payload: { objective: "Find the latest filing" },
          hop: 1,
        },
        new Date("2026-09-04T09:00:00.000Z"),
      ),
    ).toMatchObject({ createdAt: "2026-09-04T09:00:00.000Z", scope: "research.web" });
  });

  it("rejects self-targeting and over-depth messages", () => {
    expect(() =>
      createAgentMessageEnvelope({
        id: "message-2",
        senderAgentId: "agent-a",
        recipientAgentId: "agent-a",
        scope: "research.web",
        kind: "request",
        payload: {},
        hop: 0,
      }),
    ).toThrow(/cannot target its sender/i);

    expect(() =>
      createAgentMessageEnvelope({
        id: "message-3",
        senderAgentId: "agent-a",
        recipientAgentId: "agent-b",
        scope: "research.web",
        kind: "request",
        payload: {},
        hop: 5,
      }),
    ).toThrow(/between 0 and 4/i);
  });
});
