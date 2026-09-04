import { getIntegrationAccessToken } from "./oauth.server";

const PINTEREST_API = "https://api.pinterest.com/v5";
const MAX_RESPONSE_CHARS = 18_000;

export type PinterestAccountAsset = {
  username: string | null;
  accountType: string | null;
  profileImage: string | null;
  websiteUrl: string | null;
};

export type PinterestBoardAsset = {
  id: string;
  name: string;
  description: string;
  privacy: string | null;
  pinCount: number | null;
  followerCount: number | null;
};

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function numberOrNull(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

async function pinterestGet(
  userId: string,
  path: string,
  query?: Record<string, string>,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const token = await getIntegrationAccessToken(userId, "pinterest");
  if (!token) throw new Error("Pinterest is not connected or its access has expired.");
  if (!/^\/[a-z0-9_/-]*$/i.test(path) || path.includes("..")) throw new Error("Invalid Pinterest API path.");
  const url = new URL(`${PINTEREST_API}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) url.searchParams.set(key, value);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    signal: signal ?? AbortSignal.timeout(20_000),
  });
  const raw = (await response.text()).slice(0, MAX_RESPONSE_CHARS * 2);
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(`Pinterest returned an unreadable response (${response.status}).`);
  }
  if (!response.ok) {
    const message = text(payload["message"], 300) || `Pinterest returned ${response.status}.`;
    throw new Error(message);
  }
  return payload;
}

export async function discoverPinterestAccount(
  userId: string,
  signal?: AbortSignal,
): Promise<PinterestAccountAsset> {
  const payload = await pinterestGet(userId, "/user_account", undefined, signal);
  return {
    username: text(payload["username"], 120) || null,
    accountType: text(payload["account_type"], 80) || null,
    profileImage: text(payload["profile_image"], 1000) || null,
    websiteUrl: text(payload["website_url"], 1000) || null,
  };
}

export async function discoverPinterestBoards(
  userId: string,
  signal?: AbortSignal,
): Promise<PinterestBoardAsset[]> {
  const payload = await pinterestGet(userId, "/boards", { page_size: "100" }, signal);
  const items = Array.isArray(payload["items"]) ? payload["items"] as unknown[] : [];
  return items.flatMap((value): PinterestBoardAsset[] => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const row = value as Record<string, unknown>;
    const id = text(row["id"], 80);
    const name = text(row["name"], 300);
    if (!id || !name) return [];
    return [{
      id,
      name,
      description: text(row["description"], 2000),
      privacy: text(row["privacy"], 80) || null,
      pinCount: numberOrNull(row["pin_count"]),
      followerCount: numberOrNull(row["follower_count"]),
    }];
  });
}
