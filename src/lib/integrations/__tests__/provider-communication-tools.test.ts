import { describe, expect, it } from "vitest";
import { findProvider } from "../providers";

describe("communication integration capabilities", () => {
  it("advertises email draft/send and calendar tools for Google Workspace", () => {
    const google = findProvider("google");
    expect(google).toBeDefined();
    expect(google?.tools).toEqual(
      expect.arrayContaining(["connected_service", "email_draft", "email_send", "calendar"]),
    );
    expect(google?.scopes).toContain("https://www.googleapis.com/auth/gmail.compose");
    expect(google?.scopes).toContain("https://www.googleapis.com/auth/calendar.events");
  });

  it("requests Mail.Send when Microsoft email delivery is advertised", () => {
    const microsoft = findProvider("microsoft");
    expect(microsoft).toBeDefined();
    expect(microsoft?.tools).toEqual(
      expect.arrayContaining(["connected_service", "email_draft", "email_send", "calendar"]),
    );
    expect(microsoft?.scopes).toContain("Mail.ReadWrite");
    expect(microsoft?.scopes).toContain("Mail.Send");
    expect(microsoft?.scopes).toContain("Calendars.ReadWrite");
  });

  it("keeps Slack posting behind the connected Slack capability", () => {
    const slack = findProvider("slack");
    expect(slack).toBeDefined();
    expect(slack?.tools).toEqual(expect.arrayContaining(["connected_service", "slack_post"]));
    expect(slack?.scopes).toContain("chat:write");
  });
});
