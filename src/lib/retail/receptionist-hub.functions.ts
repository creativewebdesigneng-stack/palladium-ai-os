import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { communicationsRuntimeCapabilities } from "@/lib/communications/twilio-provider.server";
import {
  getRetailTwilioCapabilities,
  resolveRetailTwilioConfig,
} from "@/lib/retail/retail-twilio-carrier";
import {
  RECEPTIONIST_EXTERNAL_ACCOUNTS,
  describeReceptionistReadiness,
} from "./receptionist-readiness";

function configured(envNames: readonly string[], mode: "all" | "any") {
  const present = envNames.map((name) => Boolean(process.env[name]?.trim()));
  return mode === "all" ? present.every(Boolean) : present.some(Boolean);
}

export const getReceptionistHubStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) =>
    z
      .object({})
      .passthrough()
      .parse(value ?? {}),
  )
  .handler(async () => {
    const runtime = communicationsRuntimeCapabilities();
    const twilio = resolveRetailTwilioConfig({
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
      TWILIO_SMS_FROM_NUMBER: process.env.TWILIO_SMS_FROM_NUMBER,
      TWILIO_MESSAGING_SERVICE_SID: process.env.TWILIO_MESSAGING_SERVICE_SID,
      TWILIO_WHATSAPP_FROM: process.env.TWILIO_WHATSAPP_FROM,
      TWILIO_VOICE_FROM_NUMBER: process.env.TWILIO_VOICE_FROM_NUMBER,
    });
    const carrier = getRetailTwilioCapabilities(twilio);
    const accounts = RECEPTIONIST_EXTERNAL_ACCOUNTS.map((account) => ({
      ...account,
      configured:
        account.id === "twilio-sms"
          ? configured(account.env, "any")
          : configured(account.env, "all"),
    }));
    return describeReceptionistReadiness({
      sms: runtime.sms && carrier.sms,
      whatsapp: carrier.whatsapp,
      voice: runtime.ai_voice_calls && carrier.voice,
      phoneVerification: runtime.phone_verification,
      signedWebhooks: runtime.signed_webhooks,
      accounts,
    });
  });
