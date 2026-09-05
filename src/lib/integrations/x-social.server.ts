import { getIntegrationAccessToken } from "./oauth.server";

const X_API = "https://api.x.com/2";
const MAX_RESPONSE_CHARS = 18_000;

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function readXPayload(response: Response, context: string): Promise<Record<string, unknown>> {
  const raw = (await response.text()).slice(0, MAX_RESPONSE_CHARS * 2);
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(`X returned an unreadable ${context} response (${response.status}).`);
  }
  if (!response.ok) {
    const detail = clean(payload["detail"], 300);
    const title = clean(payload["title"], 200);
    throw new Error(detail || title || `X returned ${response.status}.`);
  }
  return payload;
}

export type XAccountInfo = {
  id: string;
  username: string;
  name: string;
  profileImageUrl: string | null;
  protected: boolean;
  verified: boolean;
};

export async function getXAccountInfo(userId: string, signal?: AbortSignal): Promise<XAccountInfo> {
  const token = await getIntegrationAccessToken(userId, "x");
  if (!token) throw new Error("X is not connected or its access has expired.");
  const url = new URL(`${X_API}/users/me`);
  url.searchParams.set("user.fields", "name,username,profile_image_url,protected,verified");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    signal: signal ?? AbortSignal.timeout(20_000),
  });
  const payload = await readXPayload(response, "account");
  const data = payload["data"] && typeof payload["data"] === "object" && !Array.isArray(payload["data"])
    ? payload["data"] as Record<string, unknown>
    : {};
  const id = clean(data["id"], 100);
  const username = clean(data["username"], 160);
  if (!id || !username) throw new Error("X account response did not include an account ID and username.");
  return {
    id,
    username,
    name: clean(data["name"], 200) || username,
    profileImageUrl: clean(data["profile_image_url"], 1000) || null,
    protected: data["protected"] === true,
    verified: data["verified"] === true,
  };
}

export async function publishXPost(input: {
  userId: string;
  text: string;
  madeWithAi?: boolean;
  paidPartnership?: boolean;
  signal?: AbortSignal;
}): Promise<{ id: string; text: string }> {
  const token = await getIntegrationAccessToken(input.userId, "x");
  if (!token) throw new Error("X is not connected or its access has expired.");
  const text = clean(input.text, 10_000);
  if (!text) throw new Error("X post text is required.");

  const response = await fetch(`${X_API}/tweets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      ...(input.madeWithAi === true ? { made_with_ai: true } : {}),
      ...(input.paidPartnership === true ? { paid_partnership: true } : {}),
    }),
    signal: input.signal ?? AbortSignal.timeout(20_000),
  });
  const payload = await readXPayload(response, "Create Post");
  const data = payload["data"] && typeof payload["data"] === "object" && !Array.isArray(payload["data"])
    ? payload["data"] as Record<string, unknown>
    : {};
  const id = clean(data["id"], 100);
  if (!id) throw new Error("X accepted the post request but did not return a post ID.");
  return { id, text: clean(data["text"], 10_000) || text };
}
