create index if not exists communication_events_recipient_fk_idx
  on public.communication_events(recipient_id);

drop policy if exists "communication preferences owner read" on public.communication_preferences;
create policy "communication preferences owner read"
  on public.communication_preferences
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "communication recipients owner read" on public.communication_recipients;
create policy "communication recipients owner read"
  on public.communication_recipients
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "communication events owner read" on public.communication_events;
create policy "communication events owner read"
  on public.communication_events
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "communication call sessions owner read" on public.communication_call_sessions;
create policy "communication call sessions owner read"
  on public.communication_call_sessions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);
