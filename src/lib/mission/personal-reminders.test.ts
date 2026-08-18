import { describe, expect, test } from "bun:test";
import {
  isPersonalReminderRequest,
  parsePersonalReminder,
  validTimeZone,
} from "./personal-reminders.server";

describe("personal reminder parsing", () => {
  const now = new Date("2026-08-18T12:00:00.000Z");

  test("recognises explicit reminder intent only", () => {
    expect(isPersonalReminderRequest("Remind me tomorrow to renew my insurance")).toBe(true);
    expect(isPersonalReminderRequest("Create a reminder for Friday")).toBe(true);
    expect(isPersonalReminderRequest("Find three hotels for Friday")).toBe(false);
  });

  test("parses tomorrow in Europe/London using BST", () => {
    const parsed = parsePersonalReminder({
      request: "Remind me tomorrow at 9am to renew my car insurance",
      timezone: "Europe/London",
      now,
    });
    expect(parsed?.dueAt).toBe("2026-08-19T08:00:00.000Z");
    expect(parsed?.body).toBe("renew my car insurance");
    expect(parsed?.assumedTime).toBe(false);
  });

  test("uses a deterministic 9am local default when only the day is supplied", () => {
    const parsed = parsePersonalReminder({
      request: "Remind me tomorrow to call the garage",
      timezone: "Europe/London",
      now,
    });
    expect(parsed?.dueAt).toBe("2026-08-19T08:00:00.000Z");
    expect(parsed?.assumedTime).toBe(true);
  });

  test("parses relative delays without timezone arithmetic", () => {
    const parsed = parsePersonalReminder({
      request: "Remind me in 20 minutes to check the oven",
      timezone: "Europe/London",
      now,
    });
    expect(parsed?.dueAt).toBe("2026-08-18T12:20:00.000Z");
    expect(parsed?.body).toBe("check the oven");
  });

  test("parses the next named weekday", () => {
    const parsed = parsePersonalReminder({
      request: "Remind me Friday at 3pm to send the invoice",
      timezone: "Europe/London",
      now,
    });
    expect(parsed?.dueAt).toBe("2026-08-21T14:00:00.000Z");
  });

  test("rejects reminder intent with no schedulable date or delay", () => {
    expect(() => parsePersonalReminder({
      request: "Remind me to renew my insurance",
      timezone: "Europe/London",
      now,
    })).toThrow(/couldn't find when/i);
  });

  test("falls back safely when a timezone is invalid", () => {
    expect(validTimeZone("not/a-zone")).toBe("UTC");
  });
});
