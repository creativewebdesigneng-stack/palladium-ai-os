-- Allow authenticated owners to finalise their own durable agent task audit rows.
-- INSERT/SELECT policies already exist; without UPDATE, runtime completion/failure
-- writes are silently blocked by RLS and rows remain stuck in `running`.
DROP POLICY IF EXISTS at_update_own ON public.agent_tasks;
CREATE POLICY at_update_own
ON public.agent_tasks
FOR UPDATE
TO authenticated
USING ((user_id = auth.uid()) AND can_access(org_id, user_id))
WITH CHECK ((user_id = auth.uid()) AND can_access(org_id, user_id));
