import { getIntegrationAccessToken } from "./oauth.server";

const LINKEDIN_API = "https://api.linkedin.com/v2";

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export type LinkedInMemberAuthor = { id: string; urn: string };

/**
 * Resolves the app-scoped LinkedIn member id from the Profile API. OIDC `sub`
 * is deliberately never accepted as a posting author identifier.
 */
export async function resolveLinkedInMemberAuthor(userId: string, signal?: AbortSignal): Promise<LinkedInMemberAuthor | null> {
  const token = await getIntegrationAccessToken(userId, "linkedin");
  if (!token) return null;
  const response = await fetch(`${LINKEDIN_API}/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "X-RestLi-Protocol-Version": "2.0.0",
    },
    signal: signal ?? AbortSignal.timeout(12_000),
  });
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw new Error(`LinkedIn profile lookup returned ${response.status}.`);
  const profile = await response.json() as Record<string, unknown>;
  const id = text(profile["id"], 160);
  if (!/^[A-Za-z0-9_-]{2,160}$/.test(id)) return null;
  return { id, urn: `urn:li:person:${id}` };
}

export async function publishLinkedInTextPost(input: {
  userId: string;
  text: string;
  signal?: AbortSignal;
}): Promise<{ postId: string }> {
  const token = await getIntegrationAccessToken(input.userId, "linkedin");
  if (!token) throw new Error("LinkedIn is not connected or its access has expired.");
  const author = await resolveLinkedInMemberAuthor(input.userId, input.signal);
  if (!author) throw new Error("LinkedIn did not expose a legitimate app-scoped member author ID for this connection.");
  const commentary = text(input.text, 3000);
  if (!commentary) throw new Error("LinkedIn post text is required.");

  const response = await fetch(`${LINKEDIN_API}/ugcPosts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-RestLi-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: author.urn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: commentary },
          shareMediaCategory: "NONE",
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    }),
    signal: input.signal ?? AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    const body = text(await response.text(), 500);
    throw new Error(body || `LinkedIn publishing returned ${response.status}.`);
  }
  const postId = text(response.headers.get("x-restli-id"), 300);
  if (!postId) throw new Error("LinkedIn accepted the post but did not return a post identifier.");
  return { postId };
}
