import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

const direct = vi.hoisted(() => ({ hasDirectConnectedService: vi.fn() }));
vi.mock("../direct-connected-service.server", () => direct);

import {
  directConnectedServiceWriteCapabilities,
  prepareDirectConnectedServiceWrite,
  validateDirectConnectedServiceWriteInput,
} from "../direct-connected-service-write.server";

beforeEach(() => {
  vi.clearAllMocks();
  direct.hasDirectConnectedService.mockResolvedValue(true);
});

describe("native governed provider writes", () => {
  it("registers only the bounded write actions promised by the provider catalogue", () => {
    expect(directConnectedServiceWriteCapabilities("hubspot").map((item) => item.action)).toEqual([
      "contact_update",
      "deal_update",
    ]);
    expect(directConnectedServiceWriteCapabilities("notion").map((item) => item.action)).toEqual([
      "child_page_create",
    ]);
    expect(directConnectedServiceWriteCapabilities("asana").map((item) => item.action)).toEqual([
      "task_create",
      "task_update",
    ]);
    expect(directConnectedServiceWriteCapabilities("linear").map((item) => item.action)).toEqual([
      "issue_create",
      "issue_update",
    ]);
  });

  it("forces direct writes through medium-risk explicit approval", async () => {
    const prepared = await prepareDirectConnectedServiceWrite({
      userId: "user-1",
      provider: "hubspot",
      action: "contact_update",
      actionInput: {
        contact_id: "123",
        properties: { firstname: "Ada", email: "ada@example.com" },
      },
    });
    expect(prepared.risk).toBe("medium");
    expect(prepared.requiresApproval).toBe(true);
    expect(prepared.input).toEqual({
      contact_id: "123",
      properties: { firstname: "Ada", email: "ada@example.com" },
    });
  });

  it("rejects unapproved fields, malformed ids and empty updates before dispatch", () => {
    expect(() => validateDirectConnectedServiceWriteInput("hubspot", "contact_update", {
      contact_id: "123",
      properties: { access_token: "secret" },
    })).toThrow(/not allowed|unsupported/i);

    expect(() => validateDirectConnectedServiceWriteInput("notion", "child_page_create", {
      parent_page_id: "../../../etc/passwd",
      title: "Unsafe",
    })).toThrow(/valid Notion parent page ID/i);

    expect(() => validateDirectConnectedServiceWriteInput("asana", "task_update", {
      task_id: "123",
    })).toThrow(/at least one Asana task field/i);

    expect(() => validateDirectConnectedServiceWriteInput("linear", "issue_update", {
      issue_id: "11111111-1111-1111-1111-111111111111",
      graphql: "mutation Anything",
    })).toThrow(/unsupported field/i);
  });

  it("keeps post-dispatch write failures non-failoverable", () => {
    const source = readFileSync(
      new URL("../integration-adapters.server.ts", import.meta.url),
      "utf8",
    );
    const start = source.indexOf("if (isDirectConnectedServiceWriteAction(input.provider, input.action))");
    expect(start).toBeGreaterThan(-1);
    const block = source.slice(start, start + 2600);
    expect(block).toContain('risk: "medium"');
    expect(source).toContain("requiresApproval: true");
    expect(block).toContain('failurePhase: "ambiguous"');
    expect(block).toContain("safeToFailover: false");
  });
});
