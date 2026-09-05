import { getIntegrationAccessToken } from "./oauth.server";

const THREADS_API = "https://graph.threads.net/v1.0";
const MAX_RESPONSE_CHARS = 18_000;

export type ThreadsAccountInfo = {
  id: string;
  username: string;
  profilePictureUrl: string | null;
};

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max) : "";
}

async function readPayload(response: Response, context: string): Promise<Record<string, unknown>> {
  const raw = (await response.text()).slice(0, MAX_RESPONSE_CHARS * 2);
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(`Threads returned an unreadable ${context} response (${response.status}).`);
  }
  if (!response.ok || payload["error"]) {
    const error = payload["error"] && typeof payload["error"] === "object" && !Array.isArray(payload["error"])
      ? payload["error"] as Record<string, unknown>
      : {};
    const message = text(error["message"], 300) || text(payload["message"], 300) || `Threads returned ${response.status}.`;
    throw new Error(message);
  }
  return payload;
}

export async function getThreadsAccountInfo(userId: string, signal?: AbortSignal): Promise<ThreadsAccountInfo> {
  const token = await getIntegrationAccessToken(userId, "threads");
  if (!token) throw new Error("Threads is not connected or its access has expired.");
  const url = new URL(`${THREADS_API}/me`);
  url.searchParams.set("fields", "id,username,threads_profile_picture_url");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    signal: signal ?? AbortSignal.timeout(20_000),
  });
  const payload = await readPayload(response, "account");
  const id = text(payload["id"], 200);
  const username = text(payload["username"], 160);
  if (!id || !username) throw new Error("Threads account identity is unavailable.");
  return {
    id,
    username,
    profilePictureUrl: text(payload["threads_profile_picture_url"], 1000) || null,
  };
}

export async function publishThreadsTextPost(input: {
  userId: string;
  text: string;
  signal?: AbortSignal;
}): Promise<{ id: string }> {
  const token = await getIntegrationAccessToken(input.userId, "threads");
  if (!token) throw new Error("Threads is not connected or its access has expired.");
  const postText = text(input.text, 500);
  if (!postText) throw new Error("Threads post text is required.");

  const createUrl = new URL(`${THREADS_API}/me/threads`);
  createUrl.searchParams.set("media_type", "TEXT");
  createUrl.searchParams.set("text", postText);
  const createResponse = await fetch(createUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    signal: input.signal ?? AbortSignal.timeout(20_000),
  });
  const created = await readPayload(createResponse, "container-create");
  const creationId = text(created["id"], 200);
  if (!creationId) throw new Error("Threads accepted the container request but did not return a creation ID.");

  const publishUrl = new URL(`${THREADS_API}/me/threads_publish`);
  publishUrl.searchParams.set("creation_id", creationId);
  const publishResponse = await fetch(publishUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    signal: input.signal ?? AbortSignal.timeout(20_000),
  });
  const published = await readPayload(publishResponse, "publish");
  const id = text(published["id"], 200);
  if (!id) throw new Error("Threads accepted the publish request but did not return a post ID.");
  return { id };
}
