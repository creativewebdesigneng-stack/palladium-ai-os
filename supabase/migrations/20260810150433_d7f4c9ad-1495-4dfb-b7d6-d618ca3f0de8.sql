
-- API keys extras
ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'live',
  ADD COLUMN IF NOT EXISTS last_four text,
  ADD COLUMN IF NOT EXISTS request_count bigint NOT NULL DEFAULT 0;

ALTER TABLE public.webhooks
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS secret_prefix text,
  ADD COLUMN IF NOT EXISTS delivery_count bigint NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.api_request_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  org_id uuid,
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  method text NOT NULL,
  path text NOT NULL,
  status_code integer NOT NULL,
  duration_ms integer,
  ip text,
  user_agent text,
  error text,
  plan_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS api_request_logs_user_created_idx ON public.api_request_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS api_request_logs_key_created_idx ON public.api_request_logs (api_key_id, created_at DESC);

GRANT SELECT ON public.api_request_logs TO authenticated;
GRANT ALL ON public.api_request_logs TO service_role;
ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "api_logs_select_own" ON public.api_request_logs;
CREATE POLICY "api_logs_select_own" ON public.api_request_logs FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  org_id uuid,
  event text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  response_status integer,
  error text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz
);
CREATE INDEX IF NOT EXISTS webhook_deliveries_user_created_idx ON public.webhook_deliveries (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS webhook_deliveries_hook_created_idx ON public.webhook_deliveries (webhook_id, created_at DESC);

GRANT SELECT ON public.webhook_deliveries TO authenticated;
GRANT ALL ON public.webhook_deliveries TO service_role;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "webhook_deliveries_select_own" ON public.webhook_deliveries;
CREATE POLICY "webhook_deliveries_select_own" ON public.webhook_deliveries FOR SELECT TO authenticated USING (user_id = auth.uid());
