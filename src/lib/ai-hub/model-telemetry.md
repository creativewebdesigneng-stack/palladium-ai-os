# AI Hub model telemetry

The Universal AI Hub reuses `agent_tasks` as the authoritative recent model-usage source. The Hub only projects aggregate provider/model usage fields: run counts, success/failure counts, token totals, cost totals, and last-used time.

The Hub does not project task prompts, task inputs or outputs, error details, user identity, agent identity, credentials, or provider secrets. Existing Supabase authentication and RLS remain authoritative for the underlying task query.
