# NVIDIA personal API keys — staged Blackstar rollout (20 October 2026)

**Merged foundation:** PR #1007. **Routing repair:** `repair/nvidia-personal-model-routing-20261020`. This extends Blackstar's original owner-scoped encrypted `model_provider_credentials` table and its existing Runtime Models/API Management UI. It does not add a connector, credential database, key brokerage service or routing framework.

## Behaviour

- Personal NVIDIA keys can be saved, tested, listed without plaintext and disconnected by the owner via the existing authenticated model-credential server functions.
- Verification uses only `GET https://integrate.api.nvidia.com/v1/models`, a bounded 12-second read-only call. Unexpected HTML/JSON without model-list data is **not** treated as verified.
- Keys are encrypted by the existing AES-GCM encrypt/decrypt utility before being stored; no plaintext provider key is returned to the browser, logs or audits.
- Runtime use is limited to the authenticated owner's personal NVIDIA choice, with the existing usage and approval policies. Personal NVIDIA credentials are **always** sent to NVIDIA's official hosted API Catalog, even if the platform operator configured a separate Dell-hosted `NVIDIA_NIM_BASE_URL`. No personal credential may be sent to an arbitrary tenant/agent hostname.
- **Model routing safety:** Resolve the authenticated owner's personal NVIDIA credential before persisting an agent task's model ID. A personal key keeps the NVIDIA hosted default (`openai/gpt-oss-20b`) even if Blackstar has an operator-configured Dell/NIM model. Explicit operator-only model IDs are rejected for personal NVIDIA API Catalog keys, without network calls.
- There is **no automatic NVIDIA metered fallback** from unrelated models. The existing operator flag `NVIDIA_NIM_FALLBACK_ENABLED` remains off by default.
- NVIDIA Catalog use may have access/usage restrictions or charges; a successful model-list probe **does not** certify inference, streaming, model tool-call behavior or Dell hardware.
- Existing separate, platform-admin-only paid diagnostic switches remain unchanged; a user's personal key does not activate those admin probes.

## Explicit default-off rollout switch

The new `NVIDIA_PERSONAL_CREDENTIALS_ENABLED` server environment flag defaults to **OFF**. While off, NVIDIA is **not shown** as a personal credential option and server handlers reject Connect/Test/Delete requests before reaching NVIDIA or the credential table. Existing workspace NVIDIA model routing and operator diagnostic actions remain unaffected.

After the migration is independently reviewed and applied, enable `NVIDIA_PERSONAL_CREDENTIALS_ENABLED=true` for Preview only, verify the complete acceptance steps, then separately approve the Production enablement. A code merge alone must not expose a non-working personal connection form.

## Required migration before enabling user-owned NVIDIA storage

Apply `supabase/migrations/20261020012000_allow_nvidia_personal_provider_credentials.sql` through the team's approved deployment process **before deploying this feature to Production**. The existing database provider constraint currently permits only OpenAI and Anthropic, so connecting NVIDIA will fail without the migration. No other schema changes are needed.

The migration only widens the provider-name check to include NVIDIA and updates the table description. It retains existing encrypted ciphertext storage, owner uniqueness, RLS and server-only access. Verify before applying:

```sql
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.model_provider_credentials'::regclass
  and conname = 'model_provider_credentials_provider_check';
```

Verify afterward that the allowed names include `nvidia` and that `anon`/`authenticated` do not receive direct write/read table privileges. Do not bypass RLS or move credentials into a client-side table.

## Personal-key live inference certification (separate, metered)

A successful catalogue request (`GET /v1/models`) **does not prove** that a NVIDIA Build account is entitled to `POST /v1/chat/completions`. For example, some accounts can list models but receive 403/404 for actual inference.

The existing Personal model providers panel now distinguishes **Key accepted** from verified inference. After securely connecting a personal NVIDIA key, an authenticated user may explicitly click **Verify live inference (may incur charges)**. This reuses Blackstar's pinned NVIDIA gateway and existing required audit writer; it does not create a separate credential store, agent runtime or approval system.

- One fixed synthetic prompt requesting the `BLACKSTAR_NIM_HEALTH_OK` marker, through the official NVIDIA hosted API and the authenticated owner's key only.
- Hard bounds: `openai/gpt-oss-20b`, maximum 128 output tokens, 15-second timeout, one attempt, no alternative providers, no tool execution and no background automation.
- **Durable request-intent audit must succeed before the metered call**. A matching outcome audit receipt must be persisted before the UI may report verified success.
- 401/403 reports inference unauthorised; 404/410/422 reports unavailable account/model access; 402 means credit/quota exhaustion; 429 means rate-limited. Errors are sanitised, and no model output, API key or endpoint is echoed to the browser or audit trail.
- User receives only a status, timestamp, model ID, non-sensitive token counts and audit receipt.
- The test proves a small response from a hosted NVIDIA model **only**. It does **not** certify streaming, personal-agent approvals, browser tools, Dell hardware/GPU placement or sustained performance.
- Operator-owned diagnostic flags remain unchanged. No inference request runs on connect, list, page load or catalogue Test. The user chooses whether to incur NVIDIA charges.

## Preview acceptance

1. Review migration + CI, then apply the migration in a dedicated **isolated** test database first. Production requires a separately approved schema rollout. Enable `NVIDIA_PERSONAL_CREDENTIALS_ENABLED=true` only in that tested environment after migration.
2. In a signed-in test account, connect a real user-owned NVIDIA Catalog key in Runtime Models. Never paste the key into chat, PR comments or test logs.
3. Verify that the key is not returned to the browser, data is persisted as ciphertext, the row belongs to the test account, and a different user cannot list, test or execute with that key.
4. Run a directly selected NVIDIA test agent, capturing real provider receipt, tokens, task status and audit evidence. Verify streamed and non-streamed flows separately. Revoke the key and verify subsequent runs fail closed.
5. If Dell NIM is configured, verify personal NVIDIA key outbound requests **still target NVIDIA's hosted API**. Dell hardware certification is separate.

The personal credential code was merged in PR #1007 with the default-off feature flag; the follow-up model-routing correction is staged separately. The database migration and live owner-key acceptance are **not complete**. No claim of real personal NVIDIA or Dell inference success.
