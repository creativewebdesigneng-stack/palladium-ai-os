ALTER TABLE public.marketplace_agents
  ADD COLUMN IF NOT EXISTS version text NOT NULL DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS required_plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS revenue_share integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS usage_requirements text,
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;