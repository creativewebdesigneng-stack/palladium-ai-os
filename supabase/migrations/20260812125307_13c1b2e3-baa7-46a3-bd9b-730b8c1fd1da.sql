DELETE FROM public.integrations a
USING public.integrations b
WHERE a.user_id = b.user_id
  AND a.provider = b.provider
  AND a.created_at < b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS integrations_user_provider_key
  ON public.integrations (user_id, provider);