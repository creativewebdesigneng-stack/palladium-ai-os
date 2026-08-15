import { beforeEach, describe, expect, it, vi } from "vitest";

const oauth = vi.hoisted(() => ({ getIntegrationAccessToken: vi.fn() }));
vi.mock("./oauth.server", () => oauth);

import {
  AsanaIntegrationError,
  listAsanaWorkspaces,
  searchAsanaProjects,
  searchAsanaProjectTasks,
} from "./asana.server";

beforeEach(() => {
  vi.clearAllMocks();
  oauth.getIntegrationAccessToken.mockResolvedValue("asana-token");
});

describe("Asana read-only executor", () => {
  it("lists workspaces with bearer auth", async () => {
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push([input, init]);
      return new Response(JSON.stringify({ data: [{ gid: "123", name: "Acme", resource_type: "workspace" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const result = await listAsanaWorkspaces({ userId: "user-1", fetchImpl });
    expect(result.workspaces[0]).toEqual({ gid: "123", name: "Acme", resourceType: "workspace" });
    expect(String(calls[0]![0])).toContain("https://app.asana.com/api/1.0/workspaces?");
    expect((calls[0]![1]?.headers as Record<string, string>)["Authorization"]).toBe("Bearer asana-token");
    expect(calls[0]![1]?.method).toBe("GET");
  });

  it("searches projects locally over bounded workspace project lists", async () => {
    const calls: string[] = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.includes("/workspaces?")) {
        return new Response(JSON.stringify({ data: [{ gid: "123", name: "Acme" }] }), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          data: [
            { gid: "456", name: "Website redesign", notes: "Q3 launch", archived: false },
            { gid: "789", name: "Internal ops", notes: "Back office", archived: false },
          ],
        }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;

    const result = await searchAsanaProjects({ userId: "user-1", query: "website", fetchImpl });
    expect(result).toHaveLength(1);
    expect(result[0]?.gid).toBe("456");
    expect(calls.some((url) => url.includes("/projects?workspace=123"))).toBe(true);
    expect(calls.some((url) => url.includes("search"))).toBe(false);
  });

  it("lists and locally filters tasks for a validated project", async () => {
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push([input, init]);
      return new Response(
        JSON.stringify({
          data: [
            { gid: "1001", name: "Publish launch page", completed: false, notes: "Website release", assignee: { name: "Maya" } },
            { gid: "1002", name: "Finance review", completed: false, notes: "Quarterly", assignee: null },
          ],
        }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;

    const result = await searchAsanaProjectTasks({
      userId: "user-1",
      projectId: "456",
      query: "launch",
      fetchImpl,
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ gid: "1001", name: "Publish launch page", assigneeName: "Maya" });
    expect(String(calls[0]![0])).toContain("/projects/456/tasks?");
    expect(calls[0]![1]?.method).toBe("GET");
  });

  it("rejects malformed GIDs before making provider requests", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    await expect(
      searchAsanaProjectTasks({ userId: "user-1", projectId: "../456", fetchImpl }),
    ).rejects.toBeInstanceOf(AsanaIntegrationError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
