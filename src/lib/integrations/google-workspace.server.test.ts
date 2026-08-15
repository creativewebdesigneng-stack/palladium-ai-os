import { beforeEach, describe, expect, it, vi } from "vitest";

const oauth = vi.hoisted(() => ({ getIntegrationAccessToken: vi.fn() }));
vi.mock("./oauth.server", () => oauth);

import {
  createGoogleGmailDraft,
  GoogleWorkspaceError,
  listGoogleCalendarEvents,
} from "./google-workspace.server";

describe("Google Workspace executor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    oauth.getIntegrationAccessToken.mockResolvedValue("access-token");
  });

  it("lists and normalises primary-calendar events", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [
            {
              id: "event-1",
              summary: "Customer call",
              start: { dateTime: "2026-08-17T09:00:00Z" },
              end: { dateTime: "2026-08-17T09:30:00Z" },
              status: "confirmed",
              htmlLink: "https://calendar.google.com/event?eid=1",
              attendees: [{ email: "person@example.com", responseStatus: "accepted" }],
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    ) as unknown as typeof fetch;

    const events = await listGoogleCalendarEvents({
      userId: "user-1",
      from: "2026-08-17T00:00:00Z",
      to: "2026-08-18T00:00:00Z",
      fetchImpl,
    });

    expect(events).toEqual([
      expect.objectContaining({
        id: "event-1",
        title: "Customer call",
        start: "2026-08-17T09:00:00Z",
        allDay: false,
      }),
    ]);
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = (fetchImpl as any).mock.calls[0];
    expect(String(url)).toContain("/calendars/primary/events");
    expect(String(url)).toContain("singleEvents=true");
    expect(init.headers.Authorization).toBe("Bearer access-token");
  });

  it("creates a Gmail draft without calling the send endpoint", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ id: "draft-1", message: { id: "message-1", threadId: "thread-1" } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    ) as unknown as typeof fetch;

    const result = await createGoogleGmailDraft({
      userId: "user-1",
      to: "person@example.com",
      subject: "Follow up",
      body: "Hello from PalladiumAI",
      fetchImpl,
    });

    expect(result).toEqual({ draftId: "draft-1", messageId: "message-1", threadId: "thread-1" });
    const [url, init] = (fetchImpl as any).mock.calls[0];
    expect(String(url)).toBe("https://gmail.googleapis.com/gmail/v1/users/me/drafts");
    expect(String(url)).not.toContain("send");
    expect(init.method).toBe("POST");
    const payload = JSON.parse(String(init.body));
    expect(typeof payload.message.raw).toBe("string");
    expect(payload.message.raw.length).toBeGreaterThan(10);
  });

  it("fails closed when no Google token is available", async () => {
    oauth.getIntegrationAccessToken.mockResolvedValue(null);
    await expect(
      listGoogleCalendarEvents({ userId: "user-1", fetchImpl: vi.fn() as unknown as typeof fetch }),
    ).rejects.toEqual(expect.objectContaining<Partial<GoogleWorkspaceError>>({ status: 401 }));
  });

  it("rejects header injection and invalid recipient addresses", async () => {
    await expect(
      createGoogleGmailDraft({
        userId: "user-1",
        to: "not-an-email\r\nBcc: victim@example.com",
        subject: "Test",
        body: "Body",
        fetchImpl: vi.fn() as unknown as typeof fetch,
      }),
    ).rejects.toThrow("valid recipient");
  });
});
