# Retail external delivery

Blackstar Retail keeps provider capability truth server-side. A channel is reported as configured only when the runtime has the credentials and sender configuration required to execute it.

## Email

Retail email reuses Blackstar's existing connected Google / Microsoft 365 integration transport. An approved Retail action is claimed before the provider side effect. Provider acceptance is persisted separately from any downstream recipient-delivery semantics.

## Twilio carrier

The optional Twilio adapter covers:

- SMS through a configured Twilio number or Messaging Service.
- WhatsApp through a configured Twilio WhatsApp sender. Free-form sends remain subject to WhatsApp's customer-service-window rules; approved Twilio Content templates can be passed as `content_sid` and `content_variables` in a governed action payload.
- Voice as a bounded outbound notification call using Twilio Programmable Voice and inline TwiML. This is not an interactive AI telephone receptionist and is not presented as one.

Configure these as server-only deployment secrets. Never expose them through `VITE_` variables or commit real values:

```text
TWILIO_ACCOUNT_SID=AC................................
TWILIO_AUTH_TOKEN=replace-in-secret-manager

# SMS: configure at least one
TWILIO_SMS_FROM_NUMBER=+15551234567
TWILIO_MESSAGING_SERVICE_SID=MG................................

# WhatsApp sender enabled in Twilio
TWILIO_WHATSAPP_FROM=+14155238886

# Outbound voice caller ID / Twilio number
TWILIO_VOICE_FROM_NUMBER=+15551234567
```

Channel capability rules:

- `sms`: account + auth token + SMS From number or Messaging Service SID.
- `whatsapp`: account + auth token + valid WhatsApp sender.
- `voice`: account + auth token + voice From number.
- `email`: a connected Google or Microsoft mailbox for the current Blackstar user.

## Execution truth

Every external communication begins as a governed action. Blackstar conditionally claims `approved -> executing` before calling the provider so the same action cannot be deliberately replayed after the side effect.

For Twilio, an HTTP success with a provider SID means Twilio accepted/queued the request. It does **not** prove final handset delivery, WhatsApp delivery/read status, or that an outbound call was answered. The communication ledger therefore stores provider acceptance and leaves `delivered_at` unset until a future authenticated delivery-status path confirms it.

If credentials are absent, malformed, or incomplete, the adapter does not simulate delivery. The existing Retail execution RPC remains authoritative and returns `provider_not_configured:<channel>`.
