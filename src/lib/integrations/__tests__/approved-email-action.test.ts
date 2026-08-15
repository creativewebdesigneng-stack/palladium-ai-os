import { describe, expect, it } from "vitest";
import { buildApprovedActionRequest } from "../approved-action.server";

const details = {
  to: "customer@example.com",
  subject: "Project update",
  body: "The approved work is complete.",
};

describe("approved email provider requests", () => {
  it("keeps Gmail draft creation separate from sending", () => {
    const draft = buildApprovedActionRequest({ actionType: "email_draft", details }, "google");
    const send = buildApprovedActionRequest({ actionType: "email_send", details }, "google");

    expect(draft.url).toBe("https://gmail.googleapis.com/gmail/v1/users/me/drafts");
    expect(JSON.parse(draft.body)).toMatchObject({ message: { raw: expect.any(String) } });

    expect(send.url).toBe("https://gmail.googleapis.com/gmail/v1/users/me/messages/send");
    expect(JSON.parse(send.body)).toMatchObject({ raw: expect.any(String) });
  });

  it("keeps Microsoft draft creation separate from sending", () => {
    const draft = buildApprovedActionRequest({ actionType: "email_draft", details }, "microsoft");
    const send = buildApprovedActionRequest({ actionType: "email_send", details }, "microsoft");

    expect(draft.url).toBe("https://graph.microsoft.com/v1.0/me/messages");
    expect(JSON.parse(draft.body)).toMatchObject({
      subject: details.subject,
      toRecipients: [{ emailAddress: { address: details.to } }],
    });

    expect(send.url).toBe("https://graph.microsoft.com/v1.0/me/sendMail");
    expect(JSON.parse(send.body)).toMatchObject({
      saveToSentItems: true,
      message: {
        subject: details.subject,
        toRecipients: [{ emailAddress: { address: details.to } }],
      },
    });
  });

  it("rejects header injection before a provider request is built", () => {
    expect(() => buildApprovedActionRequest({
      actionType: "email_send",
      details: { ...details, subject: "Hello\r\nBcc: attacker@example.com" },
    }, "google")).toThrow(/headers cannot contain line breaks/i);
  });
});
