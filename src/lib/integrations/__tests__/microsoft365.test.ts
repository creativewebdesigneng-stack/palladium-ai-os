import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../oauth.server", () => ({
  getIntegrationAccessToken: vi.fn(),
}));

import { getIntegrationAccessToken } from "../oauth.server";
import {
  createMicrosoftOutlookDraft,
  listMicrosoftCalendarEvents,
  Microsoft365Error,
} from "../microsoft365.server";

const tokenMock = vi.mocked(getIntegrationAccessToken);

beforeEach(() => {
  vi.resetAllMocks();
  tokenMock.mockResolvedValue("access-token");
});

describe("Microsoft 365 executor", () => {
  it("normalises calendar events from Microsoft Graph", async () => {
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push([input, init]);
      return new Response(
        JSON.stringify({
          value: [
            {
              id: "evt-1",
              subject: "Planning",
              start: { dateTime: "2026-08-16T09:00:00.0000000" },
              end: { dateTime: "2026-08-16T09:30:00.0000000" },
              isAllDay: false,
              isCancelled: false,
              webLink: "https://outlook.office.com/calendar/item/evt-1",
              location: { displayName: "Teams" },
              attendees: [
                {
                  emailAddress: { address: "person@example.com" },
                  status: { response: "accepted" },
                },
              ],
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };

    const events = await listMicrosoftCalendarEvents({
      userId: "user-1",
      from: "2026-08-16T00:00:00Z",
      to: "2026-08-17T00:00:00Z",
      fetchImpl: fetchImpl as typeof fetch,
    });

    expect(events).toEqual([
      expect.objectContaining({
        id: "evt-1",
        title: "Planning",
        allDay: false,
        status: "confirmed",
        location: "Teams",
      }),
    ]);
    expect(calls).toHaveLength(1);
    const [url, init] = calls[0]!;
    expect(String(url)).toContain("/me/calendarView?");
    expect((init?.headers as Record<string, string>)["Authorization"]).toBe("Bearer access-token");
  });

  it("creates an Outlook draft without calling a send endpoint", async () => {
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push([input, init]);
      return new Response(JSON.stringify({ id: "draft-1", webLink: "https://outlook.office.com/mail/draft" }), {
        status: 201,
        headers: { "content-type": "application/json" },
      });
    };

    const result = await createMicrosoftOutlookDraft({
      userId: "user-1",
      to: "to@example.com",
      subject: "Subject",
      body: "Hello",
      fetchImpl: fetchImpl as typeof fetch,
    });

    expect(result.draftId).toBe("draft-1");
    const [url, init] = calls[0]!;
    expect(String(url)).toBe("https://graph.microsoft.com/v1.0/me/messages");
    expect(String(url)).not.toMatch(/send/i);
    expect(init?.method).toBe("POST");
  });

  it("rejects invalid recipient addresses before provider access", async () => {
    const fetchImpl = vi.fn();
    await expect(
      createMicrosoftOutlookDraft({
        userId: "user-1",
        to: "not-an-email",
        subject: "Subject",
        body: "Body",
        fetchImpl: fetchImpl as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(Microsoft365Error);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fails clearly when Microsoft is not connected", async () => {
    tokenMock.mockResolvedValue(null);
    await expect(
      listMicrosoftCalendarEvents({
        userId: "user-1",
        fetchImpl: vi.fn() as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("rejects inverted calendar ranges", async () => {
    await expect(
      listMicrosoftCalendarEvents({
        userId: "user-1",
        from: "2026-08-17T00:00:00Z",
        to: "2026-08-16T00:00:00Z",
      }),
    ).rejects.toThrow("Calendar end time must be after the start time");
  });
});
