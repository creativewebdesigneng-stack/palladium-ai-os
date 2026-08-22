import { describe, expect, it } from "vitest";
import { buildApprovedActionRequest } from "@/lib/integrations/approved-action.server";

describe("approved external action request builder", () => {
  it("sends Gmail only through the fixed messages/send endpoint", () => {
    const req = buildApprovedActionRequest({ actionType: "email_send", details: { to: "person@example.com", subject: "Hello", body: "Approved body" } }, "google");
    expect(req.url).toBe("https://gmail.googleapis.com/gmail/v1/users/me/messages/send");
    expect(req.url).not.toContain("/drafts");
    expect(req.body).toContain("raw");
  });

  it("creates an Outlook draft and never calls sendMail", () => {
    const req = buildApprovedActionRequest({ actionType: "email_draft", details: { to: "person@example.com", subject: "Hello", body: "Draft body" } }, "microsoft");
    expect(req.url).toBe("https://graph.microsoft.com/v1.0/me/messages");
    expect(req.url).not.toContain("sendMail");
  });

  it("rejects email header injection", () => {
    expect(() => buildApprovedActionRequest({ actionType: "email_send", details: { to: "person@example.com\r\nBcc: attacker@example.com", subject: "Hello", body: "Body" } }, "google")).toThrow(/line breaks/);
  });

  it("creates Google calendar events only on the fixed primary-calendar endpoint", () => {
    const req = buildApprovedActionRequest({ actionType: "calendar_create", details: { title: "Planning", start: "2026-08-20T10:00:00Z", end: "2026-08-20T10:30:00Z" } }, "google");
    expect(new URL(req.url).origin).toBe("https://www.googleapis.com");
    expect(new URL(req.url).pathname).toBe("/calendar/v3/calendars/primary/events");
    expect(new URL(req.url).searchParams.get("sendUpdates")).toBe("none");
  });

  it("rejects reversed calendar ranges", () => {
    expect(() => buildApprovedActionRequest({ actionType: "calendar_create", details: { title: "Bad range", start: "2026-08-20T11:00:00Z", end: "2026-08-20T10:00:00Z" } }, "microsoft")).toThrow(/after start/);
  });

  it("posts Slack only to the fixed chat.postMessage endpoint", () => {
    const req = buildApprovedActionRequest({ actionType: "slack_post", details: { channel: "C0123456789", text: "Approved update" } }, "slack");
    expect(req.url).toBe("https://slack.com/api/chat.postMessage");
    expect(JSON.parse(req.body)).toEqual({ channel: "C0123456789", text: "Approved update" });
  });

  it("does not let an action switch providers or endpoints", () => {
    expect(() => buildApprovedActionRequest({ actionType: "slack_post", details: { channel: "C0123456789", text: "x", url: "https://evil.test" } }, "google")).toThrow(/Slack posts require/);
  });
});

describe("approved connected-service writes", () => {
  it("builds a bounded HubSpot contact PATCH without accepting arbitrary properties", () => {
    const req = buildApprovedActionRequest({ actionType: "hubspot_contact_update", details: { object_id: "12345", properties: { firstname: "Ada", jobtitle: "CTO" } } }, "hubspot");
    expect(req.method).toBe("PATCH");
    expect(req.url).toBe("https://api.hubapi.com/crm/v3/objects/contacts/12345");
    expect(JSON.parse(req.body)).toEqual({ properties: { firstname: "Ada", jobtitle: "CTO" } });
    expect(() => buildApprovedActionRequest({ actionType: "hubspot_contact_update", details: { object_id: "123", properties: { owner_secret: "x" } } }, "hubspot")).toThrow(/not allowed/);
  });

  it("creates and updates Asana tasks only on fixed task endpoints", () => {
    const create = buildApprovedActionRequest({ actionType: "asana_task_create", details: { workspace_gid: "123", project_gid: "456", name: "Ship release", due_on: "2026-08-30" } }, "asana");
    expect(create.method).toBe("POST");
    expect(create.url).toBe("https://app.asana.com/api/1.0/tasks");
    expect(JSON.parse(create.body).data.projects).toEqual(["456"]);

    const update = buildApprovedActionRequest({ actionType: "asana_task_update", details: { task_gid: "789", completed: true } }, "asana");
    expect(update.method).toBe("PUT");
    expect(update.url).toBe("https://app.asana.com/api/1.0/tasks/789");
    expect(JSON.parse(update.body).data).toEqual({ completed: true });
  });

  it("keeps Linear user input in GraphQL variables and never accepts a model-supplied document", () => {
    const hostile = 'Close issue } } mutation Evil { issueDelete(id:"x")';
    const req = buildApprovedActionRequest({ actionType: "linear_issue_create", details: { team_id: "team_123", title: hostile, description: "approved body" } }, "linear");
    const body = JSON.parse(req.body);
    expect(body.query).toContain("issueCreate");
    expect(body.query).not.toContain("issueDelete");
    expect(body.variables.input.title).toBe(hostile);
    expect(req.url).toBe("https://api.linear.app/graphql");
  });

  it("creates Notion child pages on the fixed pages endpoint with the current API version", () => {
    const req = buildApprovedActionRequest({ actionType: "notion_page_create", details: { parent_page_id: "d9824bdc-8445-4327-be8b-5b47500af6ce", title: "Approved plan", content: "Only this approved content is written." } }, "notion");
    expect(req.method).toBe("POST");
    expect(req.url).toBe("https://api.notion.com/v1/pages");
    expect(req.headers["Notion-Version"]).toBe("2026-03-11");
    expect(JSON.parse(req.body).parent.page_id).toBe("d9824bdc-8445-4327-be8b-5b47500af6ce");
  });

  it("rejects mismatched providers for approved writes", () => {
    expect(() => buildApprovedActionRequest({ actionType: "asana_task_update", details: { task_gid: "123", completed: true } }, "hubspot")).toThrow(/requires Asana/);
  });
});
