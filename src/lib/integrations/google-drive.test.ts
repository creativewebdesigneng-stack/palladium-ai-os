import { beforeEach, describe, expect, it, vi } from "vitest";

const oauth = vi.hoisted(() => ({ getIntegrationAccessToken: vi.fn() }));
vi.mock("./oauth.server", () => oauth);

import { readGoogleDriveFile, searchGoogleDriveFiles } from "./google-workspace.server";

beforeEach(() => {
  vi.clearAllMocks();
  oauth.getIntegrationAccessToken.mockResolvedValue("access-token");
});

describe("Google Drive executor", () => {
  it("searches Drive with bounded read-only fields", async () => {
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push([input, init]);
      return new Response(
        JSON.stringify({ files: [{ id: "file_12345", name: "Plan", mimeType: "text/plain", size: "42" }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };
    const files = await searchGoogleDriveFiles({
      userId: "user-1",
      query: "Plan",
      fetchImpl: fetchImpl as typeof fetch,
    });
    expect(files[0]).toMatchObject({ id: "file_12345", name: "Plan", size: 42 });
    const [url, init] = calls[0]!;
    expect(String(url)).toContain("/drive/v3/files?");
    expect(String(url)).toContain("trashed");
    expect(init?.method).toBe("GET");
  });

  it("exports Google Docs as text and bounds the returned content", async () => {
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push([input, init]);
      return new Response("x".repeat(100_010), { status: 200, headers: { "content-type": "text/plain" } });
    };
    const result = await readGoogleDriveFile({
      userId: "user-1",
      fileId: "file_12345",
      mimeType: "application/vnd.google-apps.document",
      fetchImpl: fetchImpl as typeof fetch,
    });
    expect(result.text).toHaveLength(100_000);
    expect(result.truncated).toBe(true);
    expect(String(calls[0]![0])).toContain("/export?mimeType=text%2Fplain");
  });
});
