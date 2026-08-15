import { beforeEach, describe, expect, it, vi } from "vitest";

const oauth = vi.hoisted(() => ({ getIntegrationAccessToken: vi.fn() }));
vi.mock("./oauth.server", () => oauth);

import { NotionIntegrationError, readNotionPage, searchNotionPages } from "./notion.server";

beforeEach(() => {
  vi.clearAllMocks();
  oauth.getIntegrationAccessToken.mockResolvedValue("notion-token");
});

describe("Notion read-only executor", () => {
  it("searches pages with the current API version and normalises results", async () => {
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push([input, init]);
      return new Response(
        JSON.stringify({
          results: [
            {
              id: "11111111-1111-1111-1111-111111111111",
              object: "page",
              url: "https://www.notion.so/acme",
              created_time: "2026-08-01T00:00:00.000Z",
              last_edited_time: "2026-08-14T00:00:00.000Z",
              in_trash: false,
              properties: {
                Name: { type: "title", title: [{ plain_text: "Acme plan" }] },
              },
            },
          ],
          has_more: false,
          next_cursor: null,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as unknown as typeof fetch;

    const result = await searchNotionPages({ userId: "user-1", query: "Acme", fetchImpl });
    expect(result.pages[0]).toMatchObject({
      id: "11111111-1111-1111-1111-111111111111",
      title: "Acme plan",
      inTrash: false,
    });
    expect(String(calls[0]![0])).toBe("https://api.notion.com/v1/search");
    const headers = calls[0]![1]?.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer notion-token");
    expect(headers["Notion-Version"]).toBe("2026-03-11");
    const body = JSON.parse(String(calls[0]![1]?.body));
    expect(body.filter).toEqual({ property: "object", value: "page" });
  });

  it("reads nested block text while staying read-only", async () => {
    const methods: string[] = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      methods.push(String(init?.method ?? "GET"));
      const url = String(input);
      if (url.includes("/pages/")) {
        return new Response(
          JSON.stringify({
            id: "22222222-2222-2222-2222-222222222222",
            url: "https://www.notion.so/page",
            in_trash: false,
            last_edited_time: "2026-08-14T00:00:00.000Z",
            properties: {
              title: { type: "title", title: [{ plain_text: "Project notes" }] },
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.includes("33333333-3333-3333-3333-333333333333")) {
        return new Response(
          JSON.stringify({
            results: [
              {
                id: "44444444-4444-4444-4444-444444444444",
                type: "paragraph",
                has_children: false,
                paragraph: { rich_text: [{ plain_text: "Nested detail" }] },
              },
            ],
            has_more: false,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({
          results: [
            {
              id: "33333333-3333-3333-3333-333333333333",
              type: "paragraph",
              has_children: true,
              paragraph: { rich_text: [{ plain_text: "Top level" }] },
            },
          ],
          has_more: false,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as unknown as typeof fetch;

    const page = await readNotionPage({
      userId: "user-1",
      pageId: "22222222-2222-2222-2222-222222222222",
      fetchImpl,
    });
    expect(page.title).toBe("Project notes");
    expect(page.text).toContain("Top level");
    expect(page.text).toContain("Nested detail");
    expect(page.blockCount).toBe(2);
    expect(methods.every((method) => method === "GET")).toBe(true);
  });

  it("rejects invalid page identifiers before a provider request", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    await expect(
      readNotionPage({ userId: "user-1", pageId: "../../../etc/passwd", fetchImpl }),
    ).rejects.toBeInstanceOf(NotionIntegrationError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
