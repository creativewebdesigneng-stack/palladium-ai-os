/**
 * Microsoft 365 provider executor. Server-only.
 *
 * Access tokens come from the encrypted OAuth credential store. This module
 * exposes read-only calendar access and Outlook draft creation only; it never
 * sends mail.
 */
import { getIntegrationAccessToken } from "./oauth.server";

const GRAPH = "https://graph.microsoft.com/v1.0";

type FetchLike = typeof fetch;

export class Microsoft365Error extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "Microsoft365Error";
  }
}

async function graphFetch(
  userId: string,
  path: string,
  init: RequestInit = {},
  fetchImpl: FetchLike = fetch,
): Promise<Response> {
  const token = await getIntegrationAccessToken(userId, "microsoft");
  if (!token) {
    throw new Microsoft365Error(
      "Microsoft 365 is not connected, or the connection needs to be renewed.",
      401,
    );
  }

  const response = await fetchImpl(`${GRAPH}${path}`, {
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

  let reason = "Microsoft 365 request failed.";
  try {
    const payload = (await response.json()) as any;
    reason = String(payload?.error?.message ?? payload?.error_description ?? reason);
  } catch {
    /* provider error body is optional */
  }
  throw new Microsoft365Error(reason.slice(0, 300), response.status);
}

export type MicrosoftCalendarEvent = {
  id: string;
  title: string;
  start: string | null;
  end: string | null;
  allDay: boolean;
  status: "confirmed" | "cancelled" | null;
  webLink: string | null;
  location: string | null;
  attendees: Array<{ email: string; responseStatus: string | null }>;
};

export async function listMicrosoftCalendarEvents(args: {
  userId: string;
  from?: string | null;
  to?: string | null;
  limit?: number;
  signal?: AbortSignal;
  fetchImpl?: FetchLike;
}): Promise<MicrosoftCalendarEvent[]> {
  const fromDate = args.from && !Number.isNaN(Date.parse(args.from)) ? new Date(args.from) : new Date();
  const toDate =
    args.to && !Number.isNaN(Date.parse(args.to))
      ? new Date(args.to)
      : new Date(fromDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (toDate.getTime() <= fromDate.getTime()) {
    throw new Microsoft365Error("Calendar end time must be after the start time.");
  }

  const query = new URLSearchParams({
    startDateTime: fromDate.toISOString(),
    endDateTime: toDate.toISOString(),
    "$top": String(Math.min(Math.max(args.limit ?? 10, 1), 50)),
    "$orderby": "start/dateTime",
    "$select": "id,subject,start,end,isAllDay,isCancelled,webLink,location,attendees",
  });
  const response = await graphFetch(
    args.userId,
    `/me/calendarView?${query.toString()}`,
    {
      method: "GET",
      headers: { Prefer: 'outlook.timezone="UTC"' },
      signal: args.signal,
    },
    args.fetchImpl ?? fetch,
  );
  const payload = (await response.json()) as any;
  const items = Array.isArray(payload?.value) ? payload.value : [];
  return items.map((event: any) => ({
    id: String(event?.id ?? ""),
    title: String(event?.subject ?? "Untitled event").slice(0, 300),
    start: event?.start?.dateTime ? String(event.start.dateTime) : null,
    end: event?.end?.dateTime ? String(event.end.dateTime) : null,
    allDay: Boolean(event?.isAllDay),
    status: event?.isCancelled === true ? "cancelled" : "confirmed",
    webLink: event?.webLink ? String(event.webLink) : null,
    location: event?.location?.displayName ? String(event.location.displayName).slice(0, 300) : null,
    attendees: Array.isArray(event?.attendees)
      ? event.attendees.slice(0, 50).map((attendee: any) => ({
          email: String(attendee?.emailAddress?.address ?? "").slice(0, 200),
          responseStatus: attendee?.status?.response ? String(attendee.status.response) : null,
        }))
      : [],
  }));
}

function cleanHeader(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function recipient(address: string) {
  return { emailAddress: { address } };
}

/** Creates an Outlook draft only. No /send or sendMail endpoint is used. */
export async function createMicrosoftOutlookDraft(args: {
  userId: string;
  to: string;
  subject: string;
  body: string;
  cc?: string | null;
  signal?: AbortSignal;
  fetchImpl?: FetchLike;
}): Promise<{ draftId: string; webLink: string | null }> {
  const to = cleanHeader(args.to).slice(0, 500);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    throw new Microsoft365Error("A valid recipient email address is required.");
  }
  const cc = args.cc ? cleanHeader(args.cc).slice(0, 500) : "";
  if (cc && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cc)) {
    throw new Microsoft365Error("A valid CC email address is required.");
  }

  const response = await graphFetch(
    args.userId,
    "/me/messages",
    {
      method: "POST",
      body: JSON.stringify({
        subject: cleanHeader(args.subject).slice(0, 998),
        body: { contentType: "Text", content: String(args.body ?? "").slice(0, 100_000) },
        toRecipients: [recipient(to)],
        ...(cc ? { ccRecipients: [recipient(cc)] } : {}),
      }),
      signal: args.signal,
    },
    args.fetchImpl ?? fetch,
  );
  const payload = (await response.json()) as any;
  if (!payload?.id) throw new Microsoft365Error("Microsoft did not return an Outlook draft id.");
  return {
    draftId: String(payload.id),
    webLink: payload?.webLink ? String(payload.webLink) : null,
  };
}
