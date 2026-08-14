-- A cancellation request is separate from the terminal status so the active
-- worker can observe it, abort child agent work, and close its ledger itself.
ALTER TABLE public.workflow_runs
  ADD COLUMN IF NOT EXISTS cancel_requested boolean NOT NULL DEFAULT false;
