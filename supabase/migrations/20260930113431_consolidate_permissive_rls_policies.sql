-- Applied to production Supabase as migration 20260930113431.
-- Consolidates equivalent permissive RLS policies without broadening access.

drop policy if exists marketplace_disputes_admin_read on public.marketplace_disputes;
drop policy if exists marketplace_disputes_parties_read on public.marketplace_disputes;

create policy marketplace_disputes_read
  on public.marketplace_disputes
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.marketplace_admins a
      where a.user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.marketplace_orders o
      where o.id = marketplace_disputes.order_id
        and (
          o.buyer_id = (select auth.uid())
          or o.seller_id = (select auth.uid())
        )
    )
  );

drop policy if exists marketplace_moderation_admin_read on public.marketplace_moderation_cases;
drop policy if exists marketplace_moderation_seller_read on public.marketplace_moderation_cases;

create policy marketplace_moderation_read
  on public.marketplace_moderation_cases
  for select
  to authenticated
  using (
    seller_id = (select auth.uid())
    or exists (
      select 1
      from public.marketplace_admins a
      where a.user_id = (select auth.uid())
    )
  );

drop policy if exists workflow_steps_owner_write on public.workflow_steps;

create policy workflow_steps_owner_insert
  on public.workflow_steps
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.workflows w
      where w.id = workflow_steps.workflow_id
        and w.user_id = (select auth.uid())
    )
  );

create policy workflow_steps_owner_update
  on public.workflow_steps
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.workflows w
      where w.id = workflow_steps.workflow_id
        and w.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.workflows w
      where w.id = workflow_steps.workflow_id
        and w.user_id = (select auth.uid())
    )
  );

create policy workflow_steps_owner_delete
  on public.workflow_steps
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.workflows w
      where w.id = workflow_steps.workflow_id
        and w.user_id = (select auth.uid())
    )
  );
