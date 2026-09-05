import { getIntegrationAccessToken } from "./oauth.server";

const MAX_RESPONSE_CHARS = 18_000;

export type YouTubeChannelAsset = {
  id: string;
  title: string;
  description: string;
  customUrl: string | null;
  thumbnailUrl: string | null;
  subscriberCount: string | null;
  videoCount: string | null;
  viewCount: string | null;
};

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function parseChannel(value: unknown): YouTubeChannelAsset | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const id = text(row["id"], 160);
  const snippet = row["snippet"] && typeof row["snippet"] === "object" && !Array.isArray(row["snippet"])
    ? row["snippet"] as Record<string, unknown>
    : {};
  const statistics = row["statistics"] && typeof row["statistics"] === "object" && !Array.isArray(row["statistics"])
    ? row["statistics"] as Record<string, unknown>
    : {};
  if (!id) return null;
  const thumbnails = snippet["thumbnails"] && typeof snippet["thumbnails"] === "object" && !Array.isArray(snippet["thumbnails"])
    ? snippet["thumbnails"] as Record<string, unknown>
    : {};
  const defaultThumb = thumbnails["default"] && typeof thumbnails["default"] === "object" && !Array.isArray(thumbnails["default"])
    ? thumbnails["default"] as Record<string, unknown>
    : {};
  return {
    id,
    title: text(snippet["title"], 200) || "YouTube channel",
    description: text(snippet["description"], 2000),
    customUrl: text(snippet["customUrl"], 200) || null,
    thumbnailUrl: text(defaultThumb["url"], 1000) || null,
    subscriberCount: text(statistics["subscriberCount"], 40) || null,
    videoCount: text(statistics["videoCount"], 40) || null,
    viewCount: text(statistics["viewCount"], 40) || null,
  };
}

export async function discoverYouTubeChannels(
  userId: string,
  signal?: AbortSignal,
): Promise<YouTubeChannelAsset[]> {
  const accessToken = await getIntegrationAccessToken(userId, "youtube");
  if (!accessToken) throw new Error("YouTube is not connected or its access has expired.");

  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("part", "id,snippet,statistics");
  url.searchParams.set("mine", "true");
  url.searchParams.set("maxResults", "50");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    signal: signal ?? AbortSignal.timeout(20_000),
  });
  const raw = (await response.text()).slice(0, MAX_RESPONSE_CHARS * 2);
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(`YouTube returned an unreadable response (${response.status}).`);
  }
  if (!response.ok) {
    const error = payload["error"] && typeof payload["error"] === "object" && !Array.isArray(payload["error"])
      ? payload["error"] as Record<string, unknown>
      : {};
    const message = text(error["message"], 300) || `YouTube returned ${response.status}.`;
    throw new Error(message);
  }

  const items = Array.isArray(payload["items"]) ? payload["items"] as unknown[] : [];
  return items.flatMap((item) => {
    const channel = parseChannel(item);
    return channel ? [channel] : [];
  });
}
