# Retail inbound AI receptionist

Blackstar's Retail inbound phone receptionist reuses the same grounded Retail receptionist core and governed action queue used by the in-app receptionist. It does not create a second model/provider stack and it does not let the model execute customer-service side effects directly.

## Runtime requirements

The Vercel/runtime environment must provide:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `APP_ORIGIN` set to the canonical public HTTPS Blackstar origin

Outbound carrier features may additionally use `TWILIO_SMS_FROM_NUMBER`, `TWILIO_MESSAGING_SERVICE_SID`, `TWILIO_WHATSAPP_FROM`, and `TWILIO_VOICE_FROM_NUMBER`.

Inbound calling remains disabled if the Twilio credentials or HTTPS application origin are unavailable. Blackstar must not simulate a working phone receptionist.

## Secure number pairing

Blackstar never enumerates the Twilio account's phone-number inventory to Retail tenants.

To connect a number:

1. The authenticated Retail owner selects an active receptionist profile and enters the Twilio IncomingPhoneNumber SID (`PN...`).
2. Blackstar creates a 15-minute, one-time pairing secret. Only its SHA-256 hash is stored; authenticated database reads cannot select that hash.
3. The UI shows the raw proof once as a required Twilio Friendly Name in the form `BLACKSTAR-<token>`.
4. The owner saves that exact Friendly Name on the intended Twilio number.
5. Blackstar fetches only that exact `PN...` resource from the configured Twilio account, verifies the Friendly Name proof with a timing-safe hash comparison, rejects numbers controlled by a Voice Application or SIP trunk, then configures Blackstar's voice/status webhooks.
6. The pairing is consumed after successful endpoint creation/update.

This prevents one Blackstar tenant from browsing or claiming other phone numbers in a shared carrier account.

## Signed webhook endpoints

Twilio calls these public routes:

- `POST /api/public/retail/twilio-voice/incoming`
- `POST /api/public/retail/twilio-voice/turn`
- `POST /api/public/retail/twilio-voice/status`

Every route requires `application/x-www-form-urlencoded`, validates the configured Twilio `AccountSid`, and verifies `X-Twilio-Signature` against the canonical HTTPS URL before provider data is trusted.

## Conversation and action boundaries

- A call is bounded to 20 AI turns.
- The model sees customer-safe Retail grounding only: no workspace notes, arbitrary catalog metadata, internal call summaries, or exact inventory counts.
- Inventory is reduced to `in_stock`, `low_stock`, `out_of_stock`, or `not_tracked` before reaching the model.
- Caller-specific order or appointment details still require server-side customer-contact verification before they may enter model context.
- Supported side effects are proposals only. They are inserted into `retail_reception_actions` as `pending_review` and require the existing staff review/execution path.
- Refunds, payments, store credit, inventory reservation, legal disputes, and unsupported side effects escalate to staff instead of being claimed as completed.
- If AI/runtime processing fails mid-call, Blackstar marks the call for staff follow-up and gives the caller a truthful failure message.

## Database security

`retail_reception_voice_endpoints`, `retail_reception_voice_sessions`, and `retail_reception_voice_pairings` use forced RLS. Authenticated Retail owners receive owner-scoped read access only; endpoint/session/pairing writes are performed by server-side service-role code after authentication/provider verification. The pairing token hash is not selectable by authenticated clients.

## Production verification

Do not call inbound phone reception production-live until all of the following are true:

1. exact carrier head passes dependency audit, production build/routes, strict TypeScript, full tests, and browser-worker policy checks;
2. both inbound-voice migrations are applied and RLS/grants/advisors are verified;
3. the exact merge commit is deployed to production;
4. runtime Twilio credentials and canonical `APP_ORIGIN` are configured;
5. a real Twilio IncomingPhoneNumber is owner-paired and a signed end-to-end test call reaches the grounded receptionist path.
