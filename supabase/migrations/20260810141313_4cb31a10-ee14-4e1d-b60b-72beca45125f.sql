-- Agent definition fields required by the runtime
ALTER TABLE public.personal_agents
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS model_provider text NOT NULL DEFAULT 'lovable',
  ADD COLUMN IF NOT EXISTS max_tokens integer NOT NULL DEFAULT 4096,
  ADD COLUMN IF NOT EXISTS memory_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_run_at timestamptz;

-- Task/run fields
ALTER TABLE public.agent_tasks
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS output_text text;

CREATE INDEX IF NOT EXISTS agent_tasks_agent_created_idx ON public.agent_tasks (agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS agent_tasks_user_created_idx ON public.agent_tasks (user_id, created_at DESC);

-- Never leave runs stuck in `running`: any run older than 10 minutes that is
-- still pending/queued/running is force-failed.
CREATE OR REPLACE FUNCTION public.reap_stale_agent_tasks(_user uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare _n integer;
begin
  update public.agent_tasks
     set status = 'failed',
         error = coalesce(error, 'Run timed out and was terminated by the runtime.'),
         completed_at = coalesce(completed_at, now()),
         updated_at = now()
   where status in ('pending','queued','running')
     and created_at < now() - interval '10 minutes'
     and (_user is null or user_id = _user);
  get diagnostics _n = row_count;
  return _n;
end $$;

REVOKE ALL ON FUNCTION public.reap_stale_agent_tasks(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.reap_stale_agent_tasks(uuid) TO service_role;