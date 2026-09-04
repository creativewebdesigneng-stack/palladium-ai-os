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

function httpsUrl(value: unknown, label: string, max = 2000): string {
  const raw = text(value, max);
  if (!raw) throw new Error(`${label} is required.`);
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error(`${label} must use HTTPS.`);
  return url.toString();
}

async function pinterestRequest(
  userId: string,
  path: string,
  init: { method?: "GET" | "POST"; query?: Record<string, string>; body?: Record<string, unknown>; signal?: AbortSignal } = {},
): Promise<Record<string, unknown>> {
  const token = await getIntegrationAccessToken(userId, "pinterest");
  if (!token) throw new Error("Pinterest is not connected or its access has expired.");
  if (!/^\/[a-z0-9_/-]*$/i.test(path) || path.includes("..")) throw new Error("Invalid Pinterest API path.");
  const url = new URL(`${PINTEREST_API}${path}`);
  for (const [key, value] of Object.entries(init.query ?? {})) url.searchParams.set(key, value);
  const body = init.body ? JSON.stringify(init.body) : undefined;
  const response = await fetch(url, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body } : {}),
    signal: init.signal ?? AbortSignal.timeout(20_000),
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
  const payload = await pinterestRequest(userId, "/user_account", { ...(signal ? { signal } : {}) });
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
  const payload = await pinterestRequest(userId, "/boards", { query: { page_size: "100" }, ...(signal ? { signal } : {}) });
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

export async function publishPinterestImagePin(input: {
  userId: string;
  boardId: string;
  imageUrl: string;
  title?: string;
  description: string;
  link?: string;
  signal?: AbortSignal;
}): Promise<{ id: string; boardId: string; link: string | null }> {
  const boardId = text(input.boardId, 80);
  if (!/^\d{2,80}$/.test(boardId)) throw new Error("A valid Pinterest board ID is required.");
  const imageUrl = httpsUrl(input.imageUrl, "Pinterest image URL");
  const description = text(input.description, 500);
  if (!description) throw new Error("Pinterest Pin description is required.");
  const title = text(input.title, 100);
  const link = input.link ? httpsUrl(input.link, "Pinterest destination link") : null;

  // Prove the selected board is visible to the authenticated token before dispatch.
  const boards = await discoverPinterestBoards(input.userId, input.signal);
  if (!boards.some((board) => board.id === boardId)) {
    throw new Error("The selected Pinterest board is not available to this connection.");
  }

  const payload = await pinterestRequest(input.userId, "/pins", {
    method: "POST",
    body: {
      board_id: boardId,
      ...(title ? { title } : {}),
      description,
      ...(link ? { link } : {}),
      media_source: {
        source_type: "image_url",
        url: imageUrl,
        is_standard: true,
      },
    },
    ...(input.signal ? { signal: input.signal } : {}),
  });
  const id = text(payload["id"], 100);
  if (!id) throw new Error("Pinterest accepted the request but did not return a Pin ID.");
  return { id, boardId, link };
}
