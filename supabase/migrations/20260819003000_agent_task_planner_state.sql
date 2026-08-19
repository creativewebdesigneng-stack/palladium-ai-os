-- Agent Planner v1: durable, backwards-compatible execution state.
-- Existing task rows remain valid; planner state is populated only by planner-aware runtimes.

ALTER TABLE public.agent_tasks
  ADD COLUMN IF NOT EXISTS planner_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS verification_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS replan_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.agent_tasks
  DROP CONSTRAINT IF EXISTS agent_tasks_replan_count_nonnegative;

ALTER TABLE public.agent_tasks
  ADD CONSTRAINT agent_tasks_replan_count_nonnegative CHECK (replan_count >= 0 AND replan_count <= 10);

CREATE INDEX IF NOT EXISTS agent_tasks_planner_state_gin
  ON public.agent_tasks USING gin (planner_state);

COMMENT ON COLUMN public.agent_tasks.planner_state IS
  'Durable Palladium Agent Planner state: objective, steps, current step, assumptions, thresholds and bounded re-plan metadata.';

COMMENT ON COLUMN public.agent_tasks.verification_state IS
  'Latest structured verification decision for the agent task.';

COMMENT ON COLUMN public.agent_tasks.replan_count IS
  'Number of planner re-plans performed for this task; bounded to 0..10.';
