ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS goal text,
  ADD COLUMN IF NOT EXISTS lead_agent_id uuid REFERENCES public.personal_agents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';