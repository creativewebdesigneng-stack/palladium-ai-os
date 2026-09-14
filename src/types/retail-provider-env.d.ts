declare global {
  namespace NodeJS {
    interface ProcessEnv {
      APP_ORIGIN?: string;
      TWILIO_ACCOUNT_SID?: string;
      TWILIO_AUTH_TOKEN?: string;
      TWILIO_SMS_FROM_NUMBER?: string;
      TWILIO_MESSAGING_SERVICE_SID?: string;
      TWILIO_WHATSAPP_FROM?: string;
      TWILIO_VOICE_FROM_NUMBER?: string;
    }
  }
}

export {};
