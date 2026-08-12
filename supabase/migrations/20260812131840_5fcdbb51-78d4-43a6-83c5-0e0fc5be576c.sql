ALTER TYPE public.exec_status ADD VALUE IF NOT EXISTS 'waiting_for_tool';
ALTER TYPE public.exec_status ADD VALUE IF NOT EXISTS 'waiting_for_approval';
ALTER TYPE public.exec_status ADD VALUE IF NOT EXISTS 'completed';

ALTER TABLE public.agent_tasks
  ADD COLUMN IF NOT EXISTS heartbeat_at timestamptz,
  ADD COLUMN IF NOT EXISTS tool_calls integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancel_requested boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS agent_tasks_active_heartbeat_idx
  ON public.agent_tasks (status, heartbeat_at);

CREATE OR REPLACE FUNCTION public.reap_stale_agent_tasks(_user uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare _n integer; _m integer;
begin
  -- Active runs that stopped reporting progress are force-failed.
  update public.agent_tasks
     set status = 'failed',
         error = coalesce(error, 'Run timed out and was terminated by the runtime.'),
         completed_at = coalesce(completed_at, now()),
         updated_at = now()
   where status in ('pending','queued','running','waiting_for_tool')
     and coalesce(heartbeat_at, started_at, created_at) < now() - interval '5 minutes'
     and (_user is null or user_id = _user);
  get diagnostics _n = row_count;

  -- Approval waits are not stuck runs, but they must not live forever.
  update public.agent_tasks
     set status = 'cancelled',
         error = coalesce(error, 'Approval was never granted; the run expired.'),
         completed_at = coalesce(completed_at, now()),
         updated_at = now()
   where status = 'waiting_for_approval'
     and created_at < now() - interval '7 days'
     and (_user is null or user_id = _user);
  get diagnostics _m = row_count;

  return _n + _m;
end $$;

REVOKE ALL ON FUNCTION public.reap_stale_agent_tasks(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reap_stale_agent_tasks(uuid) TO service_role;