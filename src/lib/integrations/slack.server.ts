/**
 * Slack provider executor. Server-only.
 *
 * Uses the encrypted OAuth token store. This first slice is deliberately
 * read-only: channel listing and recent channel history. Posting will be added
 * separately behind an explicit approval boundary.
 */
import { getIntegrationAccessToken } from "./oauth.server";

const SLACK_API = "https://slack.com/api";

type FetchLike = typeof fetch;

export class SlackIntegrationError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = "SlackIntegrationError";
  }
}

async function slackGet(
  userId: string,
  method: string,
  params: Record<string, string>,
  fetchImpl: FetchLike = fetch,
  signal?: AbortSignal,
) {
  const token = await getIntegrationAccessToken(userId, "slack");
  if (!token) {
    throw new SlackIntegrationError("Slack is not connected, or the connection needs to be renewed.");
  }

  const url = new URL(`${SLACK_API}/${method}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetchImpl(url.toString(), {
    method: "GET",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    signal: signal ?? AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new SlackIntegrationError(`Slack request failed (${response.status}).`);

  const payload = (await response.json()) as any;
  if (payload?.ok !== true) {
    throw new SlackIntegrationError(
      String(payload?.error ?? "Slack request failed.").slice(0, 200),
      payload?.error ? String(payload.error) : undefined,
    );
  }
  return payload;
}

export async function listSlackChannels(args: {
  userId: string;
  limit?: number;
  cursor?: string | null;
  signal?: AbortSignal;
  fetchImpl?: FetchLike;
}) {
  const payload = await slackGet(
    args.userId,
    "conversations.list",
    {
      types: "public_channel,private_channel",
      exclude_archived: "true",
      limit: String(Math.min(Math.max(args.limit ?? 50, 1), 200)),
      ...(args.cursor ? { cursor: args.cursor.slice(0, 500) } : {}),
    },
    args.fetchImpl ?? fetch,
    args.signal,
  );

  return {
    channels: (Array.isArray(payload?.channels) ? payload.channels : []).map((channel: any) => ({
      id: String(channel?.id ?? ""),
      name: String(channel?.name ?? "").slice(0, 120),
      isPrivate: Boolean(channel?.is_private),
      isMember: Boolean(channel?.is_member),
      topic: channel?.topic?.value ? String(channel.topic.value).slice(0, 500) : null,
      purpose: channel?.purpose?.value ? String(channel.purpose.value).slice(0, 500) : null,
    })),
    nextCursor: payload?.response_metadata?.next_cursor
      ? String(payload.response_metadata.next_cursor)
      : null,
  };
}

export async function getSlackChannelHistory(args: {
  userId: string;
  channelId: string;
  limit?: number;
  oldest?: string | null;
  latest?: string | null;
  signal?: AbortSignal;
  fetchImpl?: FetchLike;
}) {
  const channelId = String(args.channelId ?? "").trim();
  if (!/^[A-Z0-9]{6,20}$/i.test(channelId)) {
    throw new SlackIntegrationError("A valid Slack channel id is required.");
  }

  const payload = await slackGet(
    args.userId,
    "conversations.history",
    {
      channel: channelId,
      limit: String(Math.min(Math.max(args.limit ?? 50, 1), 100)),
      ...(args.oldest ? { oldest: String(args.oldest).slice(0, 40) } : {}),
      ...(args.latest ? { latest: String(args.latest).slice(0, 40) } : {}),
    },
    args.fetchImpl ?? fetch,
    args.signal,
  );

  return {
    channelId,
    messages: (Array.isArray(payload?.messages) ? payload.messages : []).map((message: any) => ({
      ts: String(message?.ts ?? ""),
      user: message?.user ? String(message.user).slice(0, 80) : null,
      text: String(message?.text ?? "").slice(0, 4000),
      threadTs: message?.thread_ts ? String(message.thread_ts) : null,
      replyCount: Number(message?.reply_count ?? 0) || 0,
    })),
    hasMore: Boolean(payload?.has_more),
  };
}
