/**
 * Google Workspace provider executor. Server-only.
 *
 * Uses the encrypted OAuth credential store through getIntegrationAccessToken;
 * access/refresh tokens never cross the server boundary. This module performs
 * only the exact Google API calls exposed below.
 */
import { getIntegrationAccessToken } from "./oauth.server";

const GOOGLE_CALENDAR = "https://www.googleapis.com/calendar/v3";
const GMAIL = "https://gmail.googleapis.com/gmail/v1";

export class GoogleWorkspaceError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "GoogleWorkspaceError";
  }
}

type FetchLike = typeof fetch;

async function googleFetch(
  userId: string,
  url: string,
  init: RequestInit = {},
  fetchImpl: FetchLike = fetch,
): Promise<Response> {
  const token = await getIntegrationAccessToken(userId, "google");
  if (!token) {
    throw new GoogleWorkspaceError(
      "Google Workspace is not connected, or the connection needs to be renewed.",
      401,
    );
  }

  const response = await fetchImpl(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
    signal: init.signal ?? AbortSignal.timeout(20_000),
  });

  if (response.ok) return response;

  let reason = "Google Workspace request failed.";
  try {
    const payload = (await response.json()) as any;
    reason = String(payload?.error?.message ?? payload?.error_description ?? reason);
  } catch {
    /* provider error body is optional */
  }
  throw new GoogleWorkspaceError(reason.slice(0, 300), response.status);
}

export type GoogleCalendarEvent = {
  id: string;
  title: string;
  start: string | null;
  end: string | null;
  allDay: boolean;
  status: string | null;
  htmlLink: string | null;
  location: string | null;
  attendees: Array<{ email: string; responseStatus: string | null }>;
};

/** Read-only upcoming Google Calendar events from the user's primary calendar. */
export async function listGoogleCalendarEvents(args: {
  userId: string;
  from?: string | null;
  to?: string | null;
  limit?: number;
  signal?: AbortSignal;
  fetchImpl?: FetchLike;
}): Promise<GoogleCalendarEvent[]> {
  const fromDate = args.from && !Number.isNaN(Date.parse(args.from)) ? new Date(args.from) : new Date();
  const toDate =
    args.to && !Number.isNaN(Date.parse(args.to))
      ? new Date(args.to)
      : new Date(fromDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (toDate.getTime() <= fromDate.getTime()) {
    throw new GoogleWorkspaceError("Calendar end time must be after the start time.");
  }

  const url = new URL(`${GOOGLE_CALENDAR}/calendars/primary/events`);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("timeMin", fromDate.toISOString());
  url.searchParams.set("timeMax", toDate.toISOString());
  url.searchParams.set("maxResults", String(Math.min(Math.max(args.limit ?? 10, 1), 50)));

  const response = await googleFetch(
    args.userId,
    url.toString(),
    { method: "GET", signal: args.signal },
    args.fetchImpl ?? fetch,
  );
  const payload = (await response.json()) as any;
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return items.map((event: any) => ({
    id: String(event?.id ?? ""),
    title: String(event?.summary ?? "Untitled event").slice(0, 300),
    start: event?.start?.dateTime ?? event?.start?.date ?? null,
    end: event?.end?.dateTime ?? event?.end?.date ?? null,
    allDay: Boolean(event?.start?.date && !event?.start?.dateTime),
    status: event?.status ? String(event.status) : null,
    htmlLink: event?.htmlLink ? String(event.htmlLink) : null,
    location: event?.location ? String(event.location).slice(0, 300) : null,
    attendees: Array.isArray(event?.attendees)
      ? event.attendees.slice(0, 50).map((attendee: any) => ({
          email: String(attendee?.email ?? "").slice(0, 200),
          responseStatus: attendee?.responseStatus ? String(attendee.responseStatus) : null,
        }))
      : [],
  }));
}

function base64url(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function headerValue(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

/**
 * Creates a Gmail draft only. It never calls users.messages.send or
 * users.drafts.send, so connecting Gmail cannot silently send mail.
 */
export async function createGoogleGmailDraft(args: {
  userId: string;
  to: string;
  subject: string;
  body: string;
  cc?: string | null;
  signal?: AbortSignal;
  fetchImpl?: FetchLike;
}): Promise<{ draftId: string; messageId: string | null; threadId: string | null }> {
  const to = headerValue(args.to).slice(0, 500);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    throw new GoogleWorkspaceError("A valid recipient email address is required.");
  }
  const subject = headerValue(args.subject).slice(0, 998);
  const cc = args.cc ? headerValue(args.cc).slice(0, 500) : "";
  const body = String(args.body ?? "").slice(0, 100_000);

  const raw = [
    `To: ${to}`,
    ...(cc ? [`Cc: ${cc}`] : []),
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    body,
  ].join("\r\n");

  const response = await googleFetch(
    args.userId,
    `${GMAIL}/users/me/drafts`,
    {
      method: "POST",
      body: JSON.stringify({ message: { raw: base64url(raw) } }),
      signal: args.signal,
    },
    args.fetchImpl ?? fetch,
  );
  const payload = (await response.json()) as any;
  if (!payload?.id) throw new GoogleWorkspaceError("Google did not return a Gmail draft id.");
  return {
    draftId: String(payload.id),
    messageId: payload?.message?.id ? String(payload.message.id) : null,
    threadId: payload?.message?.threadId ? String(payload.message.threadId) : null,
  };
}
