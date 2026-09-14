-- Blackstar Retail Hub: relationship-level RLS hardening for store-floor operations.

-- Replace generic insert/update checks with relationship-aware checks.
do $$
declare t text;
begin
  foreach t in array array['retail_registers','retail_cash_sessions','retail_stocktakes','retail_stocktake_lines','retail_gift_cards','retail_staff_shifts','retail_time_entries','retail_booking_reminders']
  loop
    execute format('drop policy if exists %I_insert_own on public.%I', t, t);
    execute format('drop policy if exists %I_update_own on public.%I', t, t);
  end loop;
end $$;

create policy retail_registers_insert_own on public.retail_registers for insert to authenticated with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
  and (location_id is null or exists (select 1 from public.retail_locations l where l.id = location_id and l.workspace_id = workspace_id and l.user_id = (select auth.uid())))
);
create policy retail_registers_update_own on public.retail_registers for update to authenticated using ((select auth.uid()) = user_id) with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
  and (location_id is null or exists (select 1 from public.retail_locations l where l.id = location_id and l.workspace_id = workspace_id and l.user_id = (select auth.uid())))
);

create policy retail_cash_sessions_insert_own on public.retail_cash_sessions for insert to authenticated with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.retail_registers r where r.id = register_id and r.workspace_id = workspace_id and r.user_id = (select auth.uid()))
  and (opened_by_staff_id is null or exists (select 1 from public.retail_staff s where s.id = opened_by_staff_id and s.workspace_id = workspace_id and s.user_id = (select auth.uid())))
  and (closed_by_staff_id is null or exists (select 1 from public.retail_staff s where s.id = closed_by_staff_id and s.workspace_id = workspace_id and s.user_id = (select auth.uid())))
);
create policy retail_cash_sessions_update_own on public.retail_cash_sessions for update to authenticated using ((select auth.uid()) = user_id) with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.retail_registers r where r.id = register_id and r.workspace_id = workspace_id and r.user_id = (select auth.uid()))
  and (opened_by_staff_id is null or exists (select 1 from public.retail_staff s where s.id = opened_by_staff_id and s.workspace_id = workspace_id and s.user_id = (select auth.uid())))
  and (closed_by_staff_id is null or exists (select 1 from public.retail_staff s where s.id = closed_by_staff_id and s.workspace_id = workspace_id and s.user_id = (select auth.uid())))
);

create policy retail_stocktakes_insert_own on public.retail_stocktakes for insert to authenticated with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
  and (location_id is null or exists (select 1 from public.retail_locations l where l.id = location_id and l.workspace_id = workspace_id and l.user_id = (select auth.uid())))
);
create policy retail_stocktakes_update_own on public.retail_stocktakes for update to authenticated using ((select auth.uid()) = user_id) with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
  and (location_id is null or exists (select 1 from public.retail_locations l where l.id = location_id and l.workspace_id = workspace_id and l.user_id = (select auth.uid())))
);

create policy retail_stocktake_lines_insert_own on public.retail_stocktake_lines for insert to authenticated with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.retail_stocktakes st where st.id = stocktake_id and st.workspace_id = workspace_id and st.user_id = (select auth.uid()))
  and exists (select 1 from public.retail_catalog_items i where i.id = item_id and i.workspace_id = workspace_id and i.user_id = (select auth.uid()))
);
create policy retail_stocktake_lines_update_own on public.retail_stocktake_lines for update to authenticated using ((select auth.uid()) = user_id) with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.retail_stocktakes st where st.id = stocktake_id and st.workspace_id = workspace_id and st.user_id = (select auth.uid()))
  and exists (select 1 from public.retail_catalog_items i where i.id = item_id and i.workspace_id = workspace_id and i.user_id = (select auth.uid()))
);

create policy retail_gift_cards_insert_own on public.retail_gift_cards for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
);
create policy retail_gift_cards_update_own on public.retail_gift_cards for update to authenticated using ((select auth.uid()) = user_id) with check (
  (select auth.uid()) = user_id and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
);

create policy retail_staff_shifts_insert_own on public.retail_staff_shifts for insert to authenticated with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.retail_staff s where s.id = staff_id and s.workspace_id = workspace_id and s.user_id = (select auth.uid()))
  and (location_id is null or exists (select 1 from public.retail_locations l where l.id = location_id and l.workspace_id = workspace_id and l.user_id = (select auth.uid())))
);
create policy retail_staff_shifts_update_own on public.retail_staff_shifts for update to authenticated using ((select auth.uid()) = user_id) with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.retail_staff s where s.id = staff_id and s.workspace_id = workspace_id and s.user_id = (select auth.uid()))
  and (location_id is null or exists (select 1 from public.retail_locations l where l.id = location_id and l.workspace_id = workspace_id and l.user_id = (select auth.uid())))
);

create policy retail_time_entries_insert_own on public.retail_time_entries for insert to authenticated with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.retail_staff s where s.id = staff_id and s.workspace_id = workspace_id and s.user_id = (select auth.uid()))
  and (shift_id is null or exists (select 1 from public.retail_staff_shifts sh where sh.id = shift_id and sh.workspace_id = workspace_id and sh.user_id = (select auth.uid()) and sh.staff_id = staff_id))
  and (location_id is null or exists (select 1 from public.retail_locations l where l.id = location_id and l.workspace_id = workspace_id and l.user_id = (select auth.uid())))
);
create policy retail_time_entries_update_own on public.retail_time_entries for update to authenticated using ((select auth.uid()) = user_id) with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.retail_staff s where s.id = staff_id and s.workspace_id = workspace_id and s.user_id = (select auth.uid()))
  and (shift_id is null or exists (select 1 from public.retail_staff_shifts sh where sh.id = shift_id and sh.workspace_id = workspace_id and sh.user_id = (select auth.uid()) and sh.staff_id = staff_id))
  and (location_id is null or exists (select 1 from public.retail_locations l where l.id = location_id and l.workspace_id = workspace_id and l.user_id = (select auth.uid())))
);

create policy retail_booking_reminders_insert_own on public.retail_booking_reminders for insert to authenticated with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.retail_appointments a where a.id = appointment_id and a.workspace_id = workspace_id and a.user_id = (select auth.uid()))
);
create policy retail_booking_reminders_update_own on public.retail_booking_reminders for update to authenticated using ((select auth.uid()) = user_id) with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.retail_appointments a where a.id = appointment_id and a.workspace_id = workspace_id and a.user_id = (select auth.uid()))
);
