export type ReceptionistAccountRequirement = {
  id: string;
  account: string;
  env: readonly string[];
  configured: boolean;
  purpose: string;
};

export type ReceptionistReadinessInput = {
  sms: boolean;
  whatsapp: boolean;
  voice: boolean;
  phoneVerification: boolean;
  signedWebhooks: boolean;
  accounts: ReceptionistAccountRequirement[];
};

export const RECEPTIONIST_EXTERNAL_ACCOUNTS = [
  {
    id: "twilio-account",
    account: "Twilio account",
    env: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"],
    purpose: "Carrier authentication for SMS, WhatsApp, voice, and webhook signatures",
  },
  {
    id: "twilio-sms",
    account: "Twilio SMS sender",
    env: ["TWILIO_SMS_FROM_NUMBER", "TWILIO_MESSAGING_SERVICE_SID"],
    purpose: "Either a from-number or a messaging service is required before SMS can be configured",
  },
  {
    id: "twilio-whatsapp",
    account: "Twilio WhatsApp sender",
    env: ["TWILIO_WHATSAPP_FROM"],
    purpose: "Approved WhatsApp sender address",
  },
  {
    id: "twilio-voice",
    account: "Twilio voice number and public HTTPS origin",
    env: ["TWILIO_VOICE_FROM_NUMBER", "APP_ORIGIN"],
    purpose: "Voice caller ID plus an HTTPS application origin for signed call control",
  },
  {
    id: "twilio-verify",
    account: "Twilio Verify service",
    env: ["TWILIO_VERIFY_SERVICE_SID"],
    purpose: "Phone verification codes",
  },
] as const;

export function describeReceptionistReadiness(input: ReceptionistReadinessInput) {
  return {
    textInquiry: "saved_retail_profile" as const,
    placesCalls: false as const,
    sendsMessages: false as const,
    channels: {
      sms: input.sms ? ("configured" as const) : ("disabled" as const),
      whatsapp: input.whatsapp ? ("configured" as const) : ("disabled" as const),
      voice: input.voice ? ("configured" as const) : ("disabled" as const),
      verification: input.phoneVerification ? ("configured" as const) : ("disabled" as const),
      webhooks: input.signedWebhooks ? ("configured" as const) : ("disabled" as const),
    },
    accounts: input.accounts,
    notice:
      "This hub answers from saved Retail profiles and queues governed proposals. It does not place calls or send SMS, WhatsApp, or voice messages.",
  };
}
