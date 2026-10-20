# NVIDIA personal API keys — staged Blackstar rollout (20 October 2026)

**Branch:** `feature/nvidia-personal-credentials-20261020`. This extends Blackstar's original owner-scoped encrypted `model_provider_credentials` table and its existing Runtime Models/API Management UI. It does not add a connector, credential database, key brokerage service or routing framework.

## Behaviour

- Personal NVIDIA keys can be saved, tested, listed without plaintext and disconnected by the owner via the existing authenticated model-credential server functions.
- Verification uses only `GET https://integrate.api.nvidia.com/v1/models`, a bounded 12-second read-only call. Unexpected HTML/JSON without model-list data is **not** treated as verified.
- Keys are encrypted by the existing AES-GCM encrypt/decrypt utility before being stored; no plaintext provider key is returned to the browser, logs or audits.
- Runtime use is limited to the authenticated owner's personal NVIDIA choice, with the existing usage and approval policies. Personal NVIDIA credentials are **always** sent to NVIDIA's official hosted API Catalog, even if the platform operator configured a separate Dell-hosted `NVIDIA_NIM_BASE_URL`. No personal credential may be sent to an arbitrary tenant/agent hostname.
- There is **no automatic NVIDIA metered fallback** from unrelated models. The existing operator flag `NVIDIA_NIM_FALLBACK_ENABLED` remains off by default.
- NVIDIA Catalog use may have access/usage restrictions or charges; a successful model-list probe **does not** certify inference, streaming, model tool-call behavior or Dell hardware.
- Existing separate, platform-admin-only paid diagnostic switches remain unchanged; a user's personal key does not activate those admin probes.

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

## Preview acceptance

1. Review migration + CI, then apply the migration in a dedicated **isolated** test database first. Production requires a separately approved schema rollout.
2. In a signed-in test account, connect a real user-owned NVIDIA Catalog key in Runtime Models. Never paste the key into chat, PR comments or test logs.
3. Verify that the key is not returned to the browser, data is persisted as ciphertext, the row belongs to the test account, and a different user cannot list, test or execute with that key.
4. Run a directly selected NVIDIA test agent, capturing real provider receipt, tokens, task status and audit evidence. Verify streamed and non-streamed flows separately. Revoke the key and verify subsequent runs fail closed.
5. If Dell NIM is configured, verify personal NVIDIA key outbound requests **still target NVIDIA's hosted API**. Dell hardware certification is separate.

Until the migration and live owned-key acceptance pass, this remains an **unmerged feature proposal**; no claim of real personal NVIDIA or Dell inference success.
