import { describe, expect, it } from "vitest";
import { describeReceptionistReadiness } from "./receptionist-readiness";

describe("AI receptionist readiness", () => {
  it("reports carrier configuration without enabling calls or messages from this hub", () => {
    const status = describeReceptionistReadiness({
      sms: false,
      whatsapp: false,
      voice: true,
      phoneVerification: false,
      signedWebhooks: false,
      accounts: [
        {
          id: "twilio-voice",
          account: "Twilio voice",
          env: ["TWILIO_VOICE_FROM_NUMBER"],
          configured: true,
          purpose: "Voice",
        },
      ],
    });
    expect(status.placesCalls).toBe(false);
    expect(status.sendsMessages).toBe(false);
    expect(status.channels.voice).toBe("configured");
    expect(status.channels.sms).toBe("disabled");
    expect(status.textInquiry).toBe("saved_retail_profile");
  });
});
