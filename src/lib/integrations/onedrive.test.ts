import { beforeEach, describe, expect, it, vi } from "vitest";

const oauth = vi.hoisted(() => ({ getIntegrationAccessToken: vi.fn() }));
vi.mock("./oauth.server", () => oauth);

import { readMicrosoftOneDriveFile, searchMicrosoftOneDriveFiles } from "./microsoft365.server";

beforeEach(() => {
  vi.clearAllMocks();
  oauth.getIntegrationAccessToken.mockResolvedValue("access-token");
});

describe("OneDrive executor", () => {
  it("searches files and omits folders", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          value: [
            { id: "item_12345", name: "Notes.txt", size: 12, file: { mimeType: "text/plain" } },
            { id: "folder_123", name: "Folder", folder: { childCount: 2 } },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const files = await searchMicrosoftOneDriveFiles({
      userId: "user-1",
      query: "Notes",
      fetchImpl: fetchImpl as typeof fetch,
    });
    expect(files).toHaveLength(1);
    expect(files[0]).toMatchObject({ id: "item_12345", name: "Notes.txt", mimeType: "text/plain" });
  });

  it("reads bounded text content", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response("hello", { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } }),
    );
    const result = await readMicrosoftOneDriveFile({
      userId: "user-1",
      fileId: "item_12345",
      fetchImpl: fetchImpl as typeof fetch,
    });
    expect(result).toMatchObject({ text: "hello", truncated: false });
  });

  it("refuses binary content instead of treating it as agent text", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "application/pdf" } }),
    );
    await expect(
      readMicrosoftOneDriveFile({
        userId: "user-1",
        fileId: "item_12345",
        fetchImpl: fetchImpl as typeof fetch,
      }),
    ).rejects.toThrow("binary");
  });
});
