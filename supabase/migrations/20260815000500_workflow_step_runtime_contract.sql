-- Keep persisted workflow definitions inside the set the production runtime can execute.
-- NOT VALID deliberately tolerates legacy rows so this migration can deploy safely;
-- PostgreSQL still enforces the check for every new/updated row.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'workflow_steps_runtime_kind_check'
      AND conrelid = 'public.workflow_steps'::regclass
  ) THEN
    ALTER TABLE public.workflow_steps
      ADD CONSTRAINT workflow_steps_runtime_kind_check
      CHECK (kind IN ('agent', 'approval', 'delay', 'notification'))
      NOT VALID;
  END IF;
END
$$;

COMMENT ON CONSTRAINT workflow_steps_runtime_kind_check ON public.workflow_steps IS
  'New workflow steps must use a kind implemented by the PalladiumAI workflow runtime.';
