import { beforeEach, describe, expect, it, vi } from "vitest";

const oauth = vi.hoisted(() => ({ getIntegrationAccessToken: vi.fn() }));
vi.mock("./oauth.server", () => oauth);

import { LinearIntegrationError, listLinearTeams, searchLinearIssues } from "./linear.server";

beforeEach(() => {
  vi.clearAllMocks();
  oauth.getIntegrationAccessToken.mockResolvedValue("linear-token");
});

describe("Linear read-only executor", () => {
  it("lists teams using a fixed GraphQL query and OAuth bearer token", async () => {
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push([input, init]);
      return new Response(JSON.stringify({ data: { teams: { nodes: [{ id: "team-1", name: "Engineering" }] } } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const teams = await listLinearTeams({ userId: "user-1", limit: 10, fetchImpl });
    expect(teams[0]).toEqual({ id: "team-1", name: "Engineering" });
    expect(String(calls[0]![0])).toBe("https://api.linear.app/graphql");
    const init = calls[0]![1]!;
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer linear-token");
    const body = JSON.parse(String(init.body));
    expect(body.query).toContain("query PalladiumTeams");
    expect(body.query).not.toContain("mutation");
    expect(body.variables).toEqual({ first: 10 });
  });

  it("searches issues through bounded variables rather than interpolated GraphQL", async () => {
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push([input, init]);
      return new Response(
        JSON.stringify({
          data: {
            issues: {
              nodes: [
                {
                  id: "issue-1",
                  title: "Fix billing page",
                  description: "Checkout edge case",
                  assignee: { name: "Maya" },
                  createdAt: "2026-08-01T00:00:00.000Z",
                  archivedAt: null,
                },
              ],
            },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as unknown as typeof fetch;

    const hostile = `billing\") { id } mutation Nope { issueCreate(input:{title:\"x\"}) { success } } #`;
    const issues = await searchLinearIssues({ userId: "user-1", query: hostile, fetchImpl });
    expect(issues[0]).toMatchObject({ id: "issue-1", title: "Fix billing page", assigneeName: "Maya" });
    const body = JSON.parse(String(calls[0]![1]?.body));
    expect(body.query).toContain("query PalladiumIssues");
    expect(body.query).not.toContain(hostile);
    expect(body.variables.filter.title.containsIgnoreCase).toBe(hostile.slice(0, 300));
  });

  it("rejects malformed team IDs before making a provider request", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    await expect(
      searchLinearIssues({ userId: "user-1", query: "billing", teamId: "../team", fetchImpl }),
    ).rejects.toBeInstanceOf(LinearIntegrationError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("treats GraphQL errors as failures even with HTTP 200", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ data: null, errors: [{ message: "Not allowed" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ) as unknown as typeof fetch;
    await expect(listLinearTeams({ userId: "user-1", fetchImpl })).rejects.toBeInstanceOf(
      LinearIntegrationError,
    );
  });
});
