import { beforeEach, describe, expect, it, vi } from "vitest";

const oauth = vi.hoisted(() => ({ getIntegrationAccessToken: vi.fn() }));
vi.mock("./oauth.server", () => oauth);

import { updateHubSpotContact } from "./hubspot.server";
import { createNotionChildPage } from "./notion.server";
import { createAsanaTask, updateAsanaTask } from "./asana.server";
import { createLinearIssue, updateLinearIssue } from "./linear.server";

beforeEach(() => {
  vi.clearAllMocks();
  oauth.getIntegrationAccessToken.mockImplementation(async (_userId: string, provider: string) => `${provider}-token`);
});

describe("native provider write request contracts", () => {
  it("updates only allow-listed HubSpot contact properties with PATCH", async () => {
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push([input, init]);
      return new Response(JSON.stringify({
        id: "101",
        updatedAt: "2026-10-05T20:00:00Z",
        properties: { firstname: "Ada" },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }) as unknown as typeof fetch;

    await updateHubSpotContact({
      userId: "user-1",
      contactId: "101",
      properties: { firstname: "Ada" },
      fetchImpl,
    });

    expect(String(calls[0]![0])).toBe("https://api.hubapi.com/crm/v3/objects/contacts/101");
    expect(calls[0]![1]?.method).toBe("PATCH");
    expect(JSON.parse(String(calls[0]![1]?.body))).toEqual({ properties: { firstname: "Ada" } });
  });

  it("creates only a bounded Notion child page under an explicit parent page", async () => {
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push([input, init]);
      return new Response(JSON.stringify({
        id: "22222222-2222-2222-2222-222222222222",
        url: "https://www.notion.so/created",
        created_time: "2026-10-05T20:00:00Z",
      }), { status: 200, headers: { "content-type": "application/json" } });
    }) as unknown as typeof fetch;

    await createNotionChildPage({
      userId: "user-1",
      parentPageId: "11111111-1111-1111-1111-111111111111",
      title: "Approved page",
      content: "Approved bounded content",
      fetchImpl,
    });

    expect(String(calls[0]![0])).toBe("https://api.notion.com/v1/pages");
    expect(calls[0]![1]?.method).toBe("POST");
    const body = JSON.parse(String(calls[0]![1]?.body));
    expect(body.parent).toEqual({ type: "page_id", page_id: "11111111-1111-1111-1111-111111111111" });
    expect(body.properties.title.title[0].text.content).toBe("Approved page");
    expect(body.children[0].paragraph.rich_text[0].text.content).toBe("Approved bounded content");
  });

  it("creates and updates Asana tasks only through fixed task endpoints", async () => {
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push([input, init]);
      const isCreate = String(input).endsWith("/tasks");
      return new Response(JSON.stringify({
        data: {
          gid: isCreate ? "9001" : "9002",
          name: isCreate ? "Launch" : "Updated",
          completed: !isCreate,
          permalink_url: "https://app.asana.com/0/1/2",
        },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }) as unknown as typeof fetch;

    await createAsanaTask({
      userId: "user-1",
      workspaceId: "123",
      projectId: "456",
      name: "Launch",
      dueOn: "2026-10-31",
      fetchImpl,
    });
    await updateAsanaTask({
      userId: "user-1",
      taskId: "9002",
      name: "Updated",
      completed: true,
      fetchImpl,
    });

    expect(String(calls[0]![0])).toBe("https://app.asana.com/api/1.0/tasks");
    expect(calls[0]![1]?.method).toBe("POST");
    expect(JSON.parse(String(calls[0]![1]?.body)).data.projects).toEqual(["456"]);
    expect(String(calls[1]![0])).toBe("https://app.asana.com/api/1.0/tasks/9002");
    expect(calls[1]![1]?.method).toBe("PUT");
    expect(JSON.parse(String(calls[1]![1]?.body)).data.completed).toBe(true);
  });

  it("uses fixed Linear mutations and passes user text only through variables", async () => {
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push([input, init]);
      const body = JSON.parse(String(init?.body));
      const isCreate = String(body.query).includes("BlackstarIssueCreate");
      return new Response(JSON.stringify({
        data: isCreate
          ? { issueCreate: { success: true, issue: { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", identifier: "ENG-1", title: body.variables.input.title, url: "https://linear.app/x/ENG-1" } } }
          : { issueUpdate: { success: true, issue: { id: body.variables.id, identifier: "ENG-1", title: body.variables.input.title, url: "https://linear.app/x/ENG-1" } } },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }) as unknown as typeof fetch;

    const hostile = 'Fix billing") { id } mutation Nope { issueDelete(id:"x") { success } } #';
    await createLinearIssue({
      userId: "user-1",
      teamId: "11111111-1111-1111-1111-111111111111",
      title: hostile,
      description: "Safe variable",
      fetchImpl,
    });
    await updateLinearIssue({
      userId: "user-1",
      issueId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      title: "Approved update",
      fetchImpl,
    });

    const createBody = JSON.parse(String(calls[0]![1]?.body));
    expect(createBody.query).toContain("mutation BlackstarIssueCreate");
    expect(createBody.query).not.toContain(hostile);
    expect(createBody.variables.input.title).toBe(hostile.slice(0, 500));
    const updateBody = JSON.parse(String(calls[1]![1]?.body));
    expect(updateBody.query).toContain("mutation BlackstarIssueUpdate");
    expect(updateBody.variables.id).toBe("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
  });
});
