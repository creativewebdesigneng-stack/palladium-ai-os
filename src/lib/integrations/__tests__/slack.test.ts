import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../oauth.server", () => ({
  getIntegrationAccessToken: vi.fn(),
}));

import { getIntegrationAccessToken } from "../oauth.server";
import { getSlackChannelHistory, listSlackChannels, SlackIntegrationError } from "../slack.server";

const tokenMock = vi.mocked(getIntegrationAccessToken);

beforeEach(() => {
  vi.resetAllMocks();
  tokenMock.mockResolvedValue("slack-token");
});

describe("Slack executor", () => {
  it("lists and normalises channels", async () => {
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push([input, init]);
      return new Response(
        JSON.stringify({
          ok: true,
          channels: [
            {
              id: "C12345678",
              name: "operations",
              is_private: false,
              is_member: true,
              topic: { value: "Ops updates" },
              purpose: { value: "Coordinate delivery" },
            },
          ],
          response_metadata: { next_cursor: "cursor-2" },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };

    const result = await listSlackChannels({
      userId: "user-1",
      fetchImpl: fetchImpl as typeof fetch,
    });

    expect(result.channels[0]).toEqual(
      expect.objectContaining({ id: "C12345678", name: "operations", isMember: true }),
    );
    expect(result.nextCursor).toBe("cursor-2");
    const [url, init] = calls[0]!;
    expect(String(url)).toContain("/conversations.list?");
    expect((init?.headers as Record<string, string>)["Authorization"]).toBe("Bearer slack-token");
  });

  it("returns bounded channel history", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          ok: true,
          messages: [
            { ts: "123.456", user: "U12345678", text: "Deployment complete", reply_count: 2 },
          ],
          has_more: false,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await getSlackChannelHistory({
      userId: "user-1",
      channelId: "C12345678",
      fetchImpl: fetchImpl as typeof fetch,
    });

    expect(result.messages).toEqual([
      expect.objectContaining({ ts: "123.456", text: "Deployment complete", replyCount: 2 }),
    ]);
    expect(result.hasMore).toBe(false);
  });

  it("surfaces Slack API errors", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ ok: false, error: "missing_scope" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      listSlackChannels({ userId: "user-1", fetchImpl: fetchImpl as typeof fetch }),
    ).rejects.toMatchObject({ code: "missing_scope" });
  });

  it("fails clearly when Slack is not connected", async () => {
    tokenMock.mockResolvedValue(null);
    await expect(
      listSlackChannels({ userId: "user-1", fetchImpl: vi.fn() as unknown as typeof fetch }),
    ).rejects.toBeInstanceOf(SlackIntegrationError);
  });

  it("rejects malformed channel ids before provider access", async () => {
    const fetchImpl = vi.fn();
    await expect(
      getSlackChannelHistory({
        userId: "user-1",
        channelId: "bad channel",
        fetchImpl: fetchImpl as typeof fetch,
      }),
    ).rejects.toThrow("valid Slack channel id");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
