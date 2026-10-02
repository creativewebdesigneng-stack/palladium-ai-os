-- Blackstar Always-On Intelligence control plane.
-- Adds a user-owned global autonomous runtime kill switch without replacing the
-- existing scheduler, queues, per-goal controls, approvals, guardrails or workers.

create table if not exists public.autonomous_runtime_controls (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  stop_reason text,
  stopped_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint autonomous_runtime_controls_reason_length
    check (stop_reason is null or char_length(stop_reason) <= 300)
);

alter table public.autonomous_runtime_controls enable row level security;
revoke all on public.autonomous_runtime_controls from public, anon;
grant select, insert, update on public.autonomous_runtime_controls to authenticated;
grant all on public.autonomous_runtime_controls to service_role;

drop policy if exists autonomous_runtime_controls_owner_all on public.autonomous_runtime_controls;
create policy autonomous_runtime_controls_owner_all
on public.autonomous_runtime_controls
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

comment on table public.autonomous_runtime_controls is
  'User-owned master control for Blackstar Autonomous OS. Disabled state blocks new autonomous scheduler claims and active runs are cancellation-requested by the authenticated control-plane function.';

notify pgrst,'reload schema';
